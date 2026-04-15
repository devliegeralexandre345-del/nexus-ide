import React from 'react';
import { 
  FileCode2, FileJson, FileType2, FileText, FileImage, 
  Folder, Database, Terminal, Code, Settings, FileBox 
} from 'lucide-react';

export const getFileIcon = (extension, isDirectory) => {
  if (isDirectory) {
    return <Folder size={14} className="text-lorica-warning fill-lorica-warning/20" />;
  }

  switch (extension?.toLowerCase()) {
    case 'js':
    case 'jsx':
      return <FileCode2 size={14} className="text-yellow-400" />;
    case 'ts':
    case 'tsx':
      return <FileType2 size={14} className="text-blue-400" />;
    case 'html':
      return <Code size={14} className="text-orange-400" />;
    case 'css':
      return <FileCode2 size={14} className="text-blue-300" />;
    case 'json':
      return <FileJson size={14} className="text-green-400" />;
    case 'py':
      return <Terminal size={14} className="text-blue-500" />;
    case 'sql':
      return <Database size={14} className="text-pink-400" />;
    case 'md':
      return <FileText size={14} className="text-gray-300" />;
    case 'png':
    case 'jpg':
    case 'svg':
      return <FileImage size={14} className="text-purple-400" />;
    case 'yml':
    case 'yaml':
      return <Settings size={14} className="text-gray-400" />;
    case 'cpp':
    case 'h':
    case 'c':
      return <FileBox size={14} className="text-indigo-400" />;
    case 'rs':
      return <FileBox size={14} className="text-orange-500" />;
    default:
      return <FileText size={14} className="text-lorica-textDim" />;
  }
};

export const getLanguageName = (extension) => {
  const map = {
    js: 'JavaScript', jsx: 'React', ts: 'TypeScript', tsx: 'React TS',
    py: 'Python', html: 'HTML', css: 'CSS', json: 'JSON',
    rs: 'Rust', cpp: 'C++', c: 'C', h: 'C Header', sql: 'SQL', md: 'Markdown',
    php: 'PHP', rb: 'Ruby', kt: 'Kotlin', swift: 'Swift', dart: 'Dart',
    go: 'Go', java: 'Java', cs: 'C#', sh: 'Bash', yml: 'YAML', yaml: 'YAML',
    toml: 'TOML', xml: 'XML', ini: 'INI', txt: 'Plain Text',
  };
  return map[extension?.toLowerCase()] || 'Plain Text';
};

// Lazy loading des paquets CodeMirror
export const LANGUAGE_MAP = {
  js: { loader: () => import('@codemirror/lang-javascript').then(m => m.javascript()) },
  jsx: { loader: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true })) },
  ts: { loader: () => import('@codemirror/lang-javascript').then(m => m.javascript({ typescript: true })) },
  tsx: { loader: () => import('@codemirror/lang-javascript').then(m => m.javascript({ typescript: true, jsx: true })) },
  html: { loader: () => import('@codemirror/lang-html').then(m => m.html()) },
  css: { loader: () => import('@codemirror/lang-css').then(m => m.css()) },
  json: { loader: () => import('@codemirror/lang-json').then(m => m.json()) },
  py: { loader: () => import('@codemirror/lang-python').then(m => m.python()) },
  cpp: { loader: () => import('@codemirror/lang-cpp').then(m => m.cpp()) },
  h: { loader: () => import('@codemirror/lang-cpp').then(m => m.cpp()) },
  rs: { loader: () => import('@codemirror/lang-rust').then(m => m.rust()) },
  sql: { loader: () => import('@codemirror/lang-sql').then(m => m.sql()) },
  // Nouveaux langages (tous via legacy-modes car les packages officiels n'existent pas)
  php: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/clike'))) },
  yaml: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/yaml'))) },
  yml: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/yaml'))) },
  toml: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/toml'))) },
  sh: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/shell'))) },
  bash: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/shell'))) },
  // Note: Ruby, Kotlin, Swift, Dart n'ont pas encore de support officiel CodeMirror
  // Nous utiliserons des highlighters génériques pour l'instant
  rb: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/ruby'))) },
  kt: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/clike'))) },
  swift: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/swift'))) },
  dart: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/clike'))) },
  go: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/go'))) },
  java: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/clike'))) },
  cs: { loader: () => import('@codemirror/language').then(m => m.StreamLanguage.define(require('@codemirror/legacy-modes/mode/clike'))) },
  md: { loader: () => import('@lezer/markdown').then(m => m.markdown()) },
};
