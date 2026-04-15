import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * React hook for Debug Adapter Protocol (DAP) integration
 */
export function useDAP() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [breakpoints, setBreakpoints] = useState({});
  const [variables, setVariables] = useState({});
  const [stackTrace, setStackTrace] = useState([]);
  const [debugState, setDebugState] = useState('stopped'); // 'stopped' | 'running' | 'paused'
  const [currentThread, setCurrentThread] = useState(null);
  
  // Reference to store breakpoints by file
  const breakpointsRef = useRef({});

  // Initialize DAP session
  const launchSession = useCallback(async (config) => {
    try {
      const result = await window.lorica.dap.launch(config);
      if (result.success === false) {
        throw new Error(result.error || 'Failed to launch DAP session');
      }
      
      const sessionId = result.data || result;
      const newSession = {
        id: sessionId,
        language: config.language,
        program: config.program,
        state: 'initializing',
      };
      
      setSessions(prev => [...prev, newSession]);
      setActiveSession(sessionId);
      setDebugState('running');
      
      // Set initial breakpoints if any
      if (breakpointsRef.current[config.program]) {
        const lines = breakpointsRef.current[config.program];
        await window.lorica.dap.setBreakpoints(sessionId, config.program, lines);
      }
      
      return sessionId;
    } catch (error) {
      console.error('Failed to launch DAP session:', error);
      throw error;
    }
  }, []);

  // Set breakpoints for a file
  const setBreakpointsForFile = useCallback(async (filePath, lines) => {
    if (!activeSession) {
      // Store breakpoints locally until session starts
      breakpointsRef.current[filePath] = lines;
      setBreakpoints(prev => ({
        ...prev,
        [filePath]: lines.map(line => ({
          id: `${filePath}:${line}`,
          line,
          verified: false,
        }))
      }));
      return;
    }

    try {
      const result = await window.lorica.dap.setBreakpoints(activeSession, filePath, lines);
      if (result.success === false) {
        throw new Error(result.error || 'Failed to set breakpoints');
      }

      const breakpointsResult = result.data || result;
      setBreakpoints(prev => ({
        ...prev,
        [filePath]: breakpointsResult
      }));
      breakpointsRef.current[filePath] = lines;
    } catch (error) {
      console.error('Failed to set breakpoints:', error);
      throw error;
    }
  }, [activeSession]);

  // Toggle breakpoint on a line
  const toggleBreakpoint = useCallback(async (filePath, line) => {
    const current = breakpointsRef.current[filePath] || [];
    let newLines;
    
    if (current.includes(line)) {
      newLines = current.filter(l => l !== line);
    } else {
      newLines = [...current, line].sort((a, b) => a - b);
    }
    
    await setBreakpointsForFile(filePath, newLines);
  }, [setBreakpointsForFile]);

  // Continue execution
  const continueExecution = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await window.lorica.dap.continue(activeSession);
      setDebugState('running');
    } catch (error) {
      console.error('Failed to continue execution:', error);
    }
  }, [activeSession]);

  // Step over
  const stepOver = useCallback(async (threadId = currentThread) => {
    if (!activeSession || !threadId) return;
    
    try {
      await window.lorica.dap.stepOver(activeSession, threadId);
      // Refresh stack trace after step
      setTimeout(() => refreshStackTrace(threadId), 100);
    } catch (error) {
      console.error('Failed to step over:', error);
    }
  }, [activeSession, currentThread]);

  // Step in
  const stepIn = useCallback(async (threadId = currentThread) => {
    if (!activeSession || !threadId) return;
    
    try {
      await window.lorica.dap.stepIn(activeSession, threadId);
      setTimeout(() => refreshStackTrace(threadId), 100);
    } catch (error) {
      console.error('Failed to step in:', error);
    }
  }, [activeSession, currentThread]);

  // Step out
  const stepOut = useCallback(async (threadId = currentThread) => {
    if (!activeSession || !threadId) return;
    
    try {
      await window.lorica.dap.stepOut(activeSession, threadId);
      setTimeout(() => refreshStackTrace(threadId), 100);
    } catch (error) {
      console.error('Failed to step out:', error);
    }
  }, [activeSession, currentThread]);

  // Pause execution
  const pauseExecution = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await window.lorica.dap.pause(activeSession);
      setDebugState('paused');
    } catch (error) {
      console.error('Failed to pause execution:', error);
    }
  }, [activeSession]);

  // Terminate session
  const terminateSession = useCallback(async (sessionId = activeSession) => {
    if (!sessionId) return;
    
    try {
      await window.lorica.dap.terminate(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession === sessionId) {
        setActiveSession(null);
        setDebugState('stopped');
        setStackTrace([]);
        setVariables({});
        setCurrentThread(null);
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  }, [activeSession]);

  // Get stack trace
  const refreshStackTrace = useCallback(async (threadId = currentThread) => {
    if (!activeSession || !threadId) return;
    
    try {
      const result = await window.lorica.dap.getStackTrace(activeSession, threadId);
      if (result.success === false) {
        throw new Error(result.error || 'Failed to get stack trace');
      }
      
      const frames = result.data || result;
      setStackTrace(frames);
      return frames;
    } catch (error) {
      console.error('Failed to get stack trace:', error);
      return [];
    }
  }, [activeSession, currentThread]);

  // Get variables for a scope
  const refreshVariables = useCallback(async (variablesReference) => {
    if (!activeSession) return;
    
    try {
      const result = await window.lorica.dap.getVariables(activeSession, variablesReference);
      if (result.success === false) {
        throw new Error(result.error || 'Failed to get variables');
      }
      
      const vars = result.data || result;
      setVariables(prev => ({
        ...prev,
        [variablesReference]: vars
      }));
      return vars;
    } catch (error) {
      console.error('Failed to get variables:', error);
      return [];
    }
  }, [activeSession]);

  // Evaluate expression
  const evaluateExpression = useCallback(async (expression, frameId) => {
    if (!activeSession) return null;
    
    try {
      const result = await window.lorica.dap.evaluate(activeSession, expression, frameId || 0);
      if (result.success === false) {
        throw new Error(result.error || 'Failed to evaluate expression');
      }
      
      return result.data || result;
    } catch (error) {
      console.error('Failed to evaluate expression:', error);
      return null;
    }
  }, [activeSession]);

  // Get all breakpoints for a file
  const getBreakpointsForFile = useCallback((filePath) => {
    return breakpoints[filePath] || [];
  }, [breakpoints]);

  // Check if a line has a breakpoint
  const hasBreakpoint = useCallback((filePath, line) => {
    const fileBreakpoints = breakpointsRef.current[filePath] || [];
    return fileBreakpoints.includes(line);
  }, []);

  return {
    // State
    sessions,
    activeSession,
    breakpoints,
    variables,
    stackTrace,
    debugState,
    currentThread,
    
    // Actions
    launchSession,
    setBreakpointsForFile,
    toggleBreakpoint,
    continueExecution,
    stepOver,
    stepIn,
    stepOut,
    pauseExecution,
    terminateSession,
    refreshStackTrace,
    refreshVariables,
    evaluateExpression,
    getBreakpointsForFile,
    hasBreakpoint,
    
    // Setters
    setActiveSession,
    setCurrentThread,
    setDebugState,
  };
}
