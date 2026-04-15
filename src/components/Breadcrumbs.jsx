import React from 'react';
import { ChevronRight, FileCode, Folder } from 'lucide-react';

export default function Breadcrumbs({ file, projectPath }) {
  if (!file) return null;

  // Build path segments relative to project
  let segments = [];
  if (projectPath && file.path.startsWith(projectPath)) {
    const relative = file.path.slice(projectPath.length).replace(/^[/\\]/, '');
    segments = relative.split(/[/\\]/);
  } else {
    segments = file.path.split(/[/\\]/);
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-1 bg-lorica-surface/50 border-b border-lorica-border/50 overflow-x-auto text-[10px] select-none">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={10} className="text-lorica-textDim/40 flex-shrink-0" />}
            <span
              className={`flex items-center gap-1 px-1 py-0.5 rounded transition-colors flex-shrink-0 ${
                isLast
                  ? 'text-lorica-accent font-medium'
                  : 'text-lorica-textDim hover:text-lorica-text hover:bg-lorica-border/20 cursor-default'
              }`}
            >
              {isLast ? <FileCode size={10} /> : <Folder size={10} className="opacity-50" />}
              {seg}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
