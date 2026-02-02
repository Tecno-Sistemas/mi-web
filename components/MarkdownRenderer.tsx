import React from 'react';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  // Simple parser to handle code blocks and headers for a better look
  // This avoids heavy dependencies like react-markdown for this demo
  
  const renderContent = () => {
    const lines = content.split('\n');
    let insideCodeBlock = false;
    
    return lines.map((line, index) => {
      // Code Blocks
      if (line.trim().startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        if (insideCodeBlock) {
            return <div key={index} className="bg-gray-900 rounded-t-md p-2 mt-4 text-xs text-gray-400 font-mono border border-gray-700 border-b-0">Código</div>;
        }
        return <div key={index} className="mb-4"></div>; // End of block
      }
      
      if (insideCodeBlock) {
        return (
          <div key={index} className="bg-gray-950 px-4 py-0.5 font-mono text-sm text-green-400 border-l-2 border-r-2 border-gray-800 last:border-b-2 last:rounded-b-md">
            {line}
          </div>
        );
      }

      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-bold text-brand-400 mt-6 mb-3">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-brand-500 mt-8 mb-4 border-b border-gray-700 pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-white mt-4 mb-6">{line.replace('# ', '')}</h1>;
      }

      // Lists
      if (line.trim().startsWith('- ')) {
        return <li key={index} className="ml-6 list-disc text-gray-300 mb-1">{line.replace('- ', '')}</li>;
      }
      if (line.trim().match(/^\d+\. /)) {
         return <div key={index} className="ml-6 mb-1 text-gray-300 flex"><span className="font-bold mr-2 text-brand-400">{line.split('.')[0]}.</span> <span>{line.substring(line.indexOf('.') + 1)}</span></div>;
      }

      // Bold
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <p key={index} className="mb-3 text-gray-300 leading-relaxed">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : part
            )}
          </p>
        );
      }

      // Empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }

      // Regular Paragraph
      return <p key={index} className="mb-3 text-gray-300 leading-relaxed">{line}</p>;
    });
  };

  return <div className="markdown-body font-sans">{renderContent()}</div>;
};
