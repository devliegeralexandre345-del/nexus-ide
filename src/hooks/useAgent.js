// src/hooks/useAgent.js
import { useCallback, useRef } from 'react';
import { buildToolsForPermissions, NON_DESTRUCTIVE_TOOLS } from '../utils/agentTools';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export function useAgent(state, dispatch) {
  const abortRef = useRef(null);
  // Map of toolCallId -> { resolve } — used to wait for user approval
  const approvalRef = useRef({});

  // Called by AgentCopilot when user clicks "Approuver"
  const approveToolCall = useCallback((id) => {
    approvalRef.current[id]?.resolve(true);
    delete approvalRef.current[id];
  }, []);

  // Called by AgentCopilot when user clicks "Rejeter"
  const rejectToolCall = useCallback((id) => {
    approvalRef.current[id]?.resolve(false);
    delete approvalRef.current[id];
  }, []);

  // Stop the running agent
  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'AGENT_SET_LOADING', value: false });
  }, [dispatch]);

  // Wait for user to approve or reject a tool call
  function waitForApproval(id) {
    return new Promise((resolve) => {
      approvalRef.current[id] = { resolve };
    });
  }

  // Execute a single tool call
  async function executeTool(toolCall, config, projectPath) {
    const isDestructive = !NON_DESTRUCTIVE_TOOLS.has(toolCall.name);

    if (isDestructive && !config.autoApprove) {
      // For write_file: try to read old content before asking approval
      if (toolCall.name === 'write_file' && toolCall.input?.path) {
        try {
          const r = await window.lorica.fs.readFile(toolCall.input.path);
          if (r.success) {
            dispatch({
              type: 'AGENT_UPDATE_TOOL_CALL',
              id: toolCall.id,
              updates: { oldContent: r.data.content },
            });
          }
        } catch (_) {}
      }

      const approved = await waitForApproval(toolCall.id);
      if (!approved) {
        dispatch({ type: 'AGENT_UPDATE_TOOL_CALL', id: toolCall.id, updates: { status: 'rejected' } });
        return 'Action rejected by user.';
      }
    }

    dispatch({ type: 'AGENT_UPDATE_TOOL_CALL', id: toolCall.id, updates: { status: 'running' } });

    try {
      let result = '';

      switch (toolCall.name) {
        case 'read_file': {
          const r = await window.lorica.fs.readFile(toolCall.input.path);
          result = r.success ? r.data.content : `Error: ${r.error}`;
          break;
        }
        case 'write_file': {
          const r = await window.lorica.fs.writeFile(toolCall.input.path, toolCall.input.content);
          if (r.success) {
            result = 'File written successfully.';
            // Open file in editor tab
            const name = toolCall.input.path.split(/[\\/]/).pop();
            const ext = name.includes('.') ? name.split('.').pop() : '';
            dispatch({
              type: 'OPEN_FILE',
              file: { path: toolCall.input.path, name, content: toolCall.input.content, extension: ext, dirty: false },
            });
          } else {
            result = `Error: ${r.error}`;
          }
          break;
        }
        case 'list_dir': {
          const r = await window.lorica.fs.readDir(toolCall.input.path);
          if (r.success) {
            result = r.data.map((e) => `${e.isDirectory ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
          } else {
            result = `Error: ${r.error}`;
          }
          break;
        }
        case 'create_file': {
          const r = await window.lorica.fs.createFile(toolCall.input.path);
          result = r.success ? 'File created.' : `Error: ${r.error}`;
          break;
        }
        case 'delete_file': {
          const r = await window.lorica.fs.deletePath(toolCall.input.path);
          result = r.success ? 'Deleted.' : `Error: ${r.error}`;
          break;
        }
        case 'run_command': {
          const cwd = toolCall.input.cwd || projectPath;
          const r = await window.lorica.terminal.runCommand(toolCall.input.command, cwd);
          if (r.success) {
            const d = r.data;
            result = `exit ${d.exit_code}\n${d.stdout}${d.stderr ? '\nSTDERR:\n' + d.stderr : ''}`.trim();
          } else {
            result = `Error: ${r.error}`;
          }
          break;
        }
        case 'search_files': {
          const r = await window.lorica.search.searchInFiles(
            projectPath,
            toolCall.input.query,
            toolCall.input.case_sensitive ?? false,
            50
          );
          if (r.success) {
            const matches = r.data.matches.slice(0, 20);
            result = matches.length === 0
              ? 'No matches found.'
              : matches.map((m) => `${m.preview}:${m.line} — ${m.text}`).join('\n');
          } else {
            result = `Error: ${r.error}`;
          }
          break;
        }
        case 'fetch_url': {
          try {
            const resp = await fetch(toolCall.input.url);
            const text = await resp.text();
            // Truncate to 8000 chars to avoid flooding context
            result = text.length > 8000 ? text.slice(0, 8000) + '\n[truncated]' : text;
          } catch (e) {
            result = `Fetch error: ${e.message}`;
          }
          break;
        }
        default:
          result = `Unknown tool: ${toolCall.name}`;
      }

      dispatch({ type: 'AGENT_UPDATE_TOOL_CALL', id: toolCall.id, updates: { status: 'done', result } });
      return result;
    } catch (e) {
      const errMsg = `Error: ${e.message}`;
      dispatch({ type: 'AGENT_UPDATE_TOOL_CALL', id: toolCall.id, updates: { status: 'error', result: errMsg } });
      return errMsg;
    }
  }

  // Build the initial context injection based on config
  async function buildInitialContext(config, activeFile, projectPath) {
    if (config.context === 'none' || !projectPath) return null;

    if (config.context === 'active' && activeFile) {
      return `Current open file: ${activeFile.name}\n\`\`\`${activeFile.extension}\n${activeFile.content}\n\`\`\``;
    }

    if (config.context === 'tree' || config.context === 'tree_keys') {
      const r = await window.lorica.fs.readDir(projectPath);
      if (!r.success) return null;
      const flatten = (entries, indent = '') =>
        entries.map((e) =>
          `${indent}${e.isDirectory ? '📁' : '📄'} ${e.name}${e.children ? '\n' + flatten(e.children, indent + '  ') : ''}`
        ).join('\n');
      let ctx = `Project structure (${projectPath}):\n${flatten(r.data)}`;

      if (config.context === 'tree_keys') {
        for (const keyFile of ['package.json', 'README.md', 'Cargo.toml']) {
          const candidate = `${projectPath}/${keyFile}`;
          const fr = await window.lorica.fs.readFile(candidate);
          if (fr.success) {
            ctx += `\n\n--- ${keyFile} ---\n${fr.data.content.slice(0, 3000)}`;
          }
        }
      }
      return ctx;
    }
    return null;
  }

  // Parse SSE stream and return { textContent, toolUses, stopReason }
  async function parseStream(response, dispatch) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let textContent = '';
    const toolUses = []; // { id, name, inputAccum, input }
    let stopReason = null;
    let activeToolIdx = -1;

    dispatch({ type: 'AGENT_ADD_MESSAGE', message: { role: 'assistant', content: '', toolCalls: [] } });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        let ev;
        try { ev = JSON.parse(raw); } catch { continue; }

        if (ev.type === 'content_block_start') {
          if (ev.content_block.type === 'tool_use') {
            const toolCall = {
              id: ev.content_block.id,
              name: ev.content_block.name,
              inputAccum: '',
              input: null,
              status: 'pending',
            };
            toolUses.push(toolCall);
            activeToolIdx = toolUses.length - 1;
            dispatch({
              type: 'AGENT_ADD_TOOL_CALL',
              toolCall: { id: toolCall.id, name: toolCall.name, input: {}, status: 'pending' },
            });
          } else if (ev.content_block.type === 'text') {
            activeToolIdx = -1;
          }
        } else if (ev.type === 'content_block_delta') {
          if (ev.delta.type === 'text_delta') {
            textContent += ev.delta.text;
            dispatch({ type: 'AGENT_APPEND_STREAM', text: ev.delta.text });
          } else if (ev.delta.type === 'input_json_delta' && activeToolIdx >= 0) {
            toolUses[activeToolIdx].inputAccum += ev.delta.partial_json;
          }
        } else if (ev.type === 'content_block_stop') {
          if (activeToolIdx >= 0 && toolUses[activeToolIdx].input === null) {
            try {
              toolUses[activeToolIdx].input = JSON.parse(toolUses[activeToolIdx].inputAccum);
              dispatch({
                type: 'AGENT_UPDATE_TOOL_CALL',
                id: toolUses[activeToolIdx].id,
                updates: { input: toolUses[activeToolIdx].input },
              });
            } catch (_) {
              toolUses[activeToolIdx].input = {};
            }
          }
        } else if (ev.type === 'message_delta') {
          stopReason = ev.delta?.stop_reason || stopReason;
        }
      }
    }

    return { textContent, toolUses, stopReason };
  }

  const sendMessage = useCallback(async (userMessage, activeFile) => {
    if (!state.aiApiKey) {
      dispatch({
        type: 'AGENT_ADD_MESSAGE',
        message: { role: 'assistant', content: '⚠️ Configure ta clé API Anthropic dans les Paramètres.' },
      });
      return;
    }

    const config = state.agentConfig;
    const projectPath = state.projectPath;
    const tools = buildToolsForPermissions(config.permissions);

    // Build message history for API
    const apiMessages = [];

    // Initial context injection (system-like user message)
    const ctxText = await buildInitialContext(config, activeFile, projectPath);
    if (ctxText) {
      apiMessages.push({ role: 'user', content: ctxText });
      apiMessages.push({ role: 'assistant', content: 'Contexte reçu. Comment puis-je t\'aider ?' });
    }

    // Add conversation history (skip last 2 if they were the context injection)
    for (const msg of state.agentMessages) {
      if (msg.role === 'user') {
        apiMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        // Rebuild Anthropic content blocks
        const content = [];
        if (msg.content) content.push({ type: 'text', text: msg.content });
        for (const tc of msg.toolCalls || []) {
          content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input || {} });
        }
        if (content.length > 0) apiMessages.push({ role: 'assistant', content });
      } else if (msg.role === 'tool_results') {
        apiMessages.push({ role: 'user', content: msg.results });
      }
    }

    // Add current user message
    dispatch({ type: 'AGENT_ADD_MESSAGE', message: { role: 'user', content: userMessage } });
    apiMessages.push({ role: 'user', content: userMessage });

    dispatch({ type: 'AGENT_SET_LOADING', value: true });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Agentic loop
      while (true) {
        const response = await fetch(ANTHROPIC_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': state.aiApiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8096,
            stream: true,
            tools: tools.length > 0 ? tools : undefined,
            system: `You are Lorica Agent, an expert AI embedded in the Lorica IDE. You have direct access to the user's codebase via tools. Be concise, precise, and always use tools to read files before modifying them. Project path: ${projectPath || 'unknown'}.`,
            messages: apiMessages,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          dispatch({
            type: 'AGENT_ADD_MESSAGE',
            message: { role: 'assistant', content: `❌ API Error: ${err.error?.message || response.statusText}` },
          });
          break;
        }

        const { textContent, toolUses, stopReason } = await parseStream(response, dispatch);

        // Build assistant content for API history
        const assistantContent = [];
        if (textContent) assistantContent.push({ type: 'text', text: textContent });
        for (const tu of toolUses) {
          assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input || {} });
        }
        if (assistantContent.length > 0) {
          apiMessages.push({ role: 'assistant', content: assistantContent });
        }

        if (stopReason !== 'tool_use' || toolUses.length === 0) break;

        // Execute tools and collect results
        const toolResults = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu, config, projectPath);
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: String(result) });
        }

        // Store tool results in agent messages for UI (role: 'tool_results')
        dispatch({
          type: 'AGENT_ADD_MESSAGE',
          message: { role: 'tool_results', results: toolResults, content: '' },
        });

        apiMessages.push({ role: 'user', content: toolResults });
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        dispatch({
          type: 'AGENT_ADD_MESSAGE',
          message: { role: 'assistant', content: `❌ Erreur: ${e.message}` },
        });
      }
    } finally {
      dispatch({ type: 'AGENT_SET_LOADING', value: false });
    }
  }, [state.aiApiKey, state.agentConfig, state.agentMessages, state.projectPath, dispatch]);

  return { sendMessage, approveToolCall, rejectToolCall, stop };
}
