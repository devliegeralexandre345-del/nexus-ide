/**
 * Lorica Snippets Engine
 * 
 * Provides language-aware code snippets with tab stops.
 * ${1:placeholder} syntax for cursor positions.
 */

const SNIPPETS = {
  // === JAVASCRIPT / TYPESCRIPT ===
  javascript: {
    'fn': { prefix: 'fn', label: 'Function', body: 'function ${1:name}(${2:params}) {\n  ${3}\n}' },
    'afn': { prefix: 'afn', label: 'Arrow Function', body: 'const ${1:name} = (${2:params}) => {\n  ${3}\n};' },
    'cl': { prefix: 'cl', label: 'console.log', body: 'console.log(${1});' },
    'imp': { prefix: 'imp', label: 'Import', body: "import { ${2:module} } from '${1:package}';" },
    'impd': { prefix: 'impd', label: 'Import Default', body: "import ${2:name} from '${1:package}';" },
    'iife': { prefix: 'iife', label: 'IIFE', body: '(function() {\n  ${1}\n})();' },
    'prom': { prefix: 'prom', label: 'Promise', body: 'new Promise((resolve, reject) => {\n  ${1}\n});' },
    'tc': { prefix: 'tc', label: 'Try/Catch', body: 'try {\n  ${1}\n} catch (${2:error}) {\n  ${3:console.error(error);}\n}' },
    'tca': { prefix: 'tca', label: 'Try/Catch/Async', body: 'try {\n  ${1}\n} catch (${2:error}) {\n  ${3}\n} finally {\n  ${4}\n}' },
    'forin': { prefix: 'forin', label: 'For...in', body: 'for (const ${1:key} in ${2:object}) {\n  ${3}\n}' },
    'forof': { prefix: 'forof', label: 'For...of', body: 'for (const ${1:item} of ${2:array}) {\n  ${3}\n}' },
    'map': { prefix: 'map', label: 'Array.map', body: '${1:array}.map((${2:item}) => {\n  ${3}\n});' },
    'filter': { prefix: 'filter', label: 'Array.filter', body: '${1:array}.filter((${2:item}) => ${3});' },
    'reduce': { prefix: 'reduce', label: 'Array.reduce', body: '${1:array}.reduce((${2:acc}, ${3:cur}) => {\n  ${4}\n}, ${5:initialValue});' },
    'class': { prefix: 'class', label: 'Class', body: 'class ${1:Name} {\n  constructor(${2:params}) {\n    ${3}\n  }\n\n  ${4:method}() {\n    ${5}\n  }\n}' },
    'ael': { prefix: 'ael', label: 'addEventListener', body: "${1:element}.addEventListener('${2:event}', (${3:e}) => {\n  ${4}\n});" },
    'fetch': { prefix: 'fetch', label: 'Fetch', body: "const ${1:response} = await fetch('${2:url}');\nconst ${3:data} = await ${1:response}.json();" },
    'timeout': { prefix: 'timeout', label: 'setTimeout', body: 'setTimeout(() => {\n  ${2}\n}, ${1:1000});' },
  },

  // === REACT ===
  jsx: {
    'rfc': { prefix: 'rfc', label: 'React FC', body: "import React from 'react';\n\nexport default function ${1:Component}({ ${2:props} }) {\n  return (\n    <div>\n      ${3}\n    </div>\n  );\n}" },
    'us': { prefix: 'us', label: 'useState', body: 'const [${1:state}, set${2:State}] = useState(${3:initialValue});' },
    'ue': { prefix: 'ue', label: 'useEffect', body: 'useEffect(() => {\n  ${1}\n\n  return () => {\n    ${2}\n  };\n}, [${3}]);' },
    'ur': { prefix: 'ur', label: 'useRef', body: 'const ${1:ref} = useRef(${2:null});' },
    'uc': { prefix: 'uc', label: 'useCallback', body: 'const ${1:fn} = useCallback((${2:params}) => {\n  ${3}\n}, [${4}]);' },
    'um': { prefix: 'um', label: 'useMemo', body: 'const ${1:value} = useMemo(() => {\n  return ${2};\n}, [${3}]);' },
  },

  // === PYTHON ===
  python: {
    'def': { prefix: 'def', label: 'Function', body: 'def ${1:function_name}(${2:params}):\n    ${3:pass}' },
    'adef': { prefix: 'adef', label: 'Async Function', body: 'async def ${1:function_name}(${2:params}):\n    ${3:pass}' },
    'class': { prefix: 'class', label: 'Class', body: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}\n\n    def ${4:method}(self):\n        ${5:pass}' },
    'if': { prefix: 'if', label: 'If', body: 'if ${1:condition}:\n    ${2:pass}' },
    'ife': { prefix: 'ife', label: 'If/Else', body: 'if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}' },
    'for': { prefix: 'for', label: 'For', body: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}' },
    'while': { prefix: 'while', label: 'While', body: 'while ${1:condition}:\n    ${2:pass}' },
    'tc': { prefix: 'tc', label: 'Try/Except', body: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:print(e)}' },
    'with': { prefix: 'with', label: 'With', body: "with ${1:open('file')} as ${2:f}:\n    ${3:pass}" },
    'main': { prefix: 'main', label: 'Main', body: "def main():\n    ${1:pass}\n\nif __name__ == '__main__':\n    main()" },
    'lc': { prefix: 'lc', label: 'List Comprehension', body: '[${1:expr} for ${2:item} in ${3:iterable}]' },
    'dc': { prefix: 'dc', label: 'Dict Comprehension', body: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}' },
  },

  // === RUST ===
  rust: {
    'fn': { prefix: 'fn', label: 'Function', body: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n    ${4:todo!()}\n}' },
    'pfn': { prefix: 'pfn', label: 'Pub Function', body: 'pub fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n    ${4:todo!()}\n}' },
    'struct': { prefix: 'struct', label: 'Struct', body: '#[derive(Debug)]\npub struct ${1:Name} {\n    pub ${2:field}: ${3:Type},\n}' },
    'impl': { prefix: 'impl', label: 'Impl', body: 'impl ${1:Type} {\n    pub fn ${2:method}(&self) -> ${3:ReturnType} {\n        ${4:todo!()}\n    }\n}' },
    'enum': { prefix: 'enum', label: 'Enum', body: '#[derive(Debug)]\npub enum ${1:Name} {\n    ${2:Variant1},\n    ${3:Variant2},\n}' },
    'match': { prefix: 'match', label: 'Match', body: 'match ${1:value} {\n    ${2:pattern} => ${3:expr},\n    _ => ${4:expr},\n}' },
    'test': { prefix: 'test', label: 'Test', body: '#[test]\nfn ${1:test_name}() {\n    ${2:assert!(true);}\n}' },
    'main': { prefix: 'main', label: 'Main', body: 'fn main() {\n    ${1}\n}' },
    'tc': { prefix: 'tc', label: 'Result match', body: 'match ${1:result} {\n    Ok(${2:val}) => ${3:val},\n    Err(${4:e}) => ${5:return Err(e)},\n}' },
  },

  // === HTML ===
  html: {
    '!': { prefix: '!', label: 'HTML5 Boilerplate', body: '<!DOCTYPE html>\n<html lang="${1:en}">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${2:Document}</title>\n</head>\n<body>\n    ${3}\n</body>\n</html>' },
    'div': { prefix: 'div', label: 'Div', body: '<div class="${1:class}">\n    ${2}\n</div>' },
    'a': { prefix: 'a', label: 'Link', body: '<a href="${1:#}">${2:Link}</a>' },
    'img': { prefix: 'img', label: 'Image', body: '<img src="${1:src}" alt="${2:alt}" />' },
    'ul': { prefix: 'ul', label: 'Unordered List', body: '<ul>\n    <li>${1}</li>\n    <li>${2}</li>\n</ul>' },
    'form': { prefix: 'form', label: 'Form', body: '<form action="${1:#}" method="${2:post}">\n    ${3}\n    <button type="submit">${4:Submit}</button>\n</form>' },
    'input': { prefix: 'input', label: 'Input', body: '<input type="${1:text}" name="${2:name}" placeholder="${3}" />' },
    'script': { prefix: 'script', label: 'Script Tag', body: '<script>\n    ${1}\n</script>' },
    'link': { prefix: 'link', label: 'CSS Link', body: '<link rel="stylesheet" href="${1:styles.css}" />' },
  },

  // === CSS ===
  css: {
    'flex': { prefix: 'flex', label: 'Flexbox', body: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};' },
    'grid': { prefix: 'grid', label: 'Grid', body: 'display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};' },
    'media': { prefix: 'media', label: 'Media Query', body: '@media (max-width: ${1:768px}) {\n    ${2}\n}' },
    'var': { prefix: 'var', label: 'CSS Variable', body: '--${1:name}: ${2:value};' },
    'anim': { prefix: 'anim', label: 'Animation', body: '@keyframes ${1:name} {\n    from { ${2:opacity: 0;} }\n    to { ${3:opacity: 1;} }\n}' },
    'trans': { prefix: 'trans', label: 'Transition', body: 'transition: ${1:all} ${2:0.3s} ${3:ease};' },
  },

  // === C/C++ ===
  cpp: {
    'main': { prefix: 'main', label: 'Main', body: '#include <iostream>\n\nint main(int argc, char* argv[]) {\n    ${1}\n    return 0;\n}' },
    'class': { prefix: 'class', label: 'Class', body: 'class ${1:Name} {\npublic:\n    ${1:Name}();\n    ~${1:Name}();\n\nprivate:\n    ${2}\n};' },
    'for': { prefix: 'for', label: 'For Loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3}\n}' },
    'forauto': { prefix: 'forauto', label: 'Range For', body: 'for (auto& ${1:item} : ${2:container}) {\n    ${3}\n}' },
    'cout': { prefix: 'cout', label: 'cout', body: 'std::cout << ${1:"text"} << std::endl;' },
    'include': { prefix: 'include', label: '#include', body: '#include <${1:iostream}>' },
  },

  // === C# ===
  csharp: {
    'class': { prefix: 'class', label: 'Class', body: 'public class ${1:Name}\n{\n    public ${1:Name}()\n    {\n        ${2}\n    }\n}' },
    'prop': { prefix: 'prop', label: 'Property', body: 'public ${1:string} ${2:Name} { get; set; }' },
    'main': { prefix: 'main', label: 'Main', body: 'using System;\n\nclass Program\n{\n    static void Main(string[] args)\n    {\n        ${1}\n    }\n}' },
    'for': { prefix: 'for', label: 'For', body: 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++)\n{\n    ${3}\n}' },
    'foreach': { prefix: 'foreach', label: 'Foreach', body: 'foreach (var ${1:item} in ${2:collection})\n{\n    ${3}\n}' },
    'tc': { prefix: 'tc', label: 'Try/Catch', body: 'try\n{\n    ${1}\n}\ncatch (${2:Exception} ${3:ex})\n{\n    ${4}\n}' },
    'async': { prefix: 'async', label: 'Async Method', body: 'public async Task${1:<T>} ${2:MethodName}(${3:params})\n{\n    ${4}\n}' },
  },
};

// Alias some languages
SNIPPETS.typescript = { ...SNIPPETS.javascript };
SNIPPETS.tsx = { ...SNIPPETS.jsx, ...SNIPPETS.javascript };
SNIPPETS.js = SNIPPETS.javascript;
SNIPPETS.ts = SNIPPETS.typescript;
SNIPPETS.py = SNIPPETS.python;
SNIPPETS.rs = SNIPPETS.rust;
SNIPPETS.c = SNIPPETS.cpp;
SNIPPETS.cs = SNIPPETS.csharp;
SNIPPETS.htm = SNIPPETS.html;

/**
 * Get snippets for a file extension
 */
export function getSnippetsForExtension(ext) {
  const key = (ext || '').replace('.', '').toLowerCase();
  return SNIPPETS[key] || {};
}

/**
 * Get all snippet prefixes for autocomplete
 */
export function getSnippetCompletions(ext) {
  const snippets = getSnippetsForExtension(ext);
  return Object.values(snippets).map(s => ({
    label: s.prefix,
    detail: s.label,
    apply: s.body.replace(/\$\{\d+:?([^}]*)}/g, '$1'), // Strip tab stops for preview
    rawBody: s.body,
  }));
}

/**
 * Expand a snippet prefix into its body
 */
export function expandSnippet(prefix, ext) {
  const snippets = getSnippetsForExtension(ext);
  const match = Object.values(snippets).find(s => s.prefix === prefix);
  if (!match) return null;
  // Strip tab stop markers for simple insertion
  return match.body.replace(/\$\{\d+:?([^}]*)}/g, '$1');
}

export default SNIPPETS;

