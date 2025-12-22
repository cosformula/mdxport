import mermaid from 'mermaid';

let initialized = false;

const encoder = new TextEncoder();

/**
 * Initialize mermaid if not already
 */
function init() {
	if (initialized) return;
	mermaid.initialize({
		startOnLoad: false,
		theme: 'neutral', // Better for tech docs
		securityLevel: 'loose', // Needed for some charts?
		fontFamily: 'sans-serif',
		htmlLabels: false, // Critical for Typst SVG support
		flowchart: { htmlLabels: false },
		suppressErrorRendering: true // Prevent error rendering in DOM
	});
	initialized = true;
}

/**
 * Render mermaid code to SVG Uint8Array
 * Uses an isolated container to prevent error DOM leakage
 */
export async function renderMermaidToSvg(code: string, id: string): Promise<Uint8Array> {
	init();
	
	// Create an isolated off-screen container for Mermaid rendering
	const container = document.createElement('div');
	container.id = `mermaid-container-${id}`;
	container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; visibility: hidden;';
	document.body.appendChild(container);
	
	try {
		// mermaid.render returns an object with svg property in v10+
		const { svg } = await mermaid.render(id, code, container);
		return encoder.encode(svg);
	} catch (error) {
		console.error('Mermaid render error:', error);
		// Return a placeholder SVG that indicates there was an error
		// but in a controlled, clean way
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const escapedMessage = errorMessage.replace(/[<>&"']/g, (c) => {
			const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
			return entities[c] || c;
		}).slice(0, 50); // Truncate long messages
		return encoder.encode(
			`<svg width="300" height="60" xmlns="http://www.w3.org/2000/svg">
				<rect width="100%" height="100%" fill="#fff3cd" rx="4"/>
				<text x="10" y="25" fill="#856404" font-size="12" font-family="sans-serif">⚠️ Mermaid Diagram Error</text>
				<text x="10" y="45" fill="#856404" font-size="10" font-family="sans-serif">${escapedMessage}</text>
			</svg>`
		);
	} finally {
		// Always clean up the container
		container.remove();
		// Also clean up any stray mermaid error elements that might have been created
		const strayElements = document.querySelectorAll(`#d${id}, [data-mermaid-id="${id}"]`);
		strayElements.forEach(el => el.remove());
	}
}
