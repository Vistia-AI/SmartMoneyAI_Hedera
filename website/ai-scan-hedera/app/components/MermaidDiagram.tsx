'use client';
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  isFullScreen?: boolean;
}

const MermaidDiagram = ({ chart, isFullScreen = false }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !chart) return;

      try {
        console.log('Attempting to render chart:', chart);

        // Validate chart content
        if (!chart.includes('graph LR')) {
          throw new Error('Invalid diagram format: Missing "graph LR" declaration');
        }

        // Initialize mermaid with enhanced config
        await mermaid.initialize({
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            rankSpacing: 100,
            nodeSpacing: 100,
            padding: 20,
          },
          // Add font size configuration
          fontSize: isFullScreen ? 16 : 14,
        });

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Create the diagram container with specific dimensions
        const diagramContainer = document.createElement('pre');
        diagramContainer.className = 'mermaid';
        diagramContainer.innerHTML = chart;
        containerRef.current.appendChild(diagramContainer);

        console.log('Running mermaid parse...');
        await mermaid.parse(chart);
        console.log('Parse successful, running render...');

        // Run mermaid with error handling
        const renderResult = await mermaid.run({
          querySelector: '.mermaid',
          suppressErrors: false,
        });

        // Add scaling class after render
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement instanceof SVGSVGElement) {
          // Set specific dimensions for better scaling
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = isFullScreen ? '75vh' : 'auto';
          svgElement.style.minWidth = isFullScreen ? '800px' : '400px';
          
          // Ensure proper viewBox for scaling
          if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
            const width = parseInt(svgElement.getAttribute('width') || '800');
            const height = parseInt(svgElement.getAttribute('height') || '600');
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          }

          // Add smooth transitions for interactions
          svgElement.style.transition = 'all 0.3s ease';
          
          // Enhance edges and nodes
          const edges = svgElement.querySelectorAll('.edge');
          const nodes = svgElement.querySelectorAll('.node');
          
          edges.forEach((edge) => {
            if (edge instanceof SVGElement) {
              edge.style.strokeWidth = '2';
              edge.style.transition = 'all 0.3s ease';
            }
          });
          
          nodes.forEach((node) => {
            if (node instanceof SVGElement) {
              node.style.transition = 'all 0.3s ease';
            }
          });
        }

        console.log('Render complete');
        setError(null);
        setRetryCount(0);

      } catch (err) {
        console.error('Mermaid render error:', err);
        
        // Implement retry logic for transient failures
        if (retryCount < maxRetries) {
          console.log(`Retrying render (attempt ${retryCount + 1} of ${maxRetries})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(renderDiagram, 1000); // Retry after 1 second
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="space-y-4">
              <div class="p-4 text-red-500 border border-red-200 rounded-lg">
                Error rendering diagram: ${err instanceof Error ? err.message : 'Unknown error'}
              </div>
              <pre class="p-4 bg-gray-50 rounded-lg overflow-auto text-sm">
                ${chart}
              </pre>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [chart, isFullScreen, retryCount]);

  if (!chart) {
    return null;
  }

  return (
    <div className={`mermaid-container space-y-4 ${isFullScreen ? 'h-full' : ''}`}>
      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div 
        ref={containerRef}
        className={`border rounded-lg bg-white p-4 ${
          isFullScreen 
            ? 'min-h-[75vh] flex items-center justify-center'
            : 'min-h-[200px] flex items-center justify-center'
        }`}
      />
    </div>
  );
};

export default MermaidDiagram;