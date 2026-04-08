/**
 * Extract individual page SVGs from a composite typst-ts SVG string.
 * Each page is a `<g class="typst-page">` element. Shared `<defs>` and `<style>`
 * are cloned into each extracted page SVG.
 *
 * @param svgString - The full SVG string from `renderSvg()`
 * @returns Array of standalone SVG strings, one per page
 */
export function extractPageSvgs(svgString: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(svgString, 'image/svg+xml');
	const root = doc.documentElement;
	const defs = root.querySelectorAll('defs');
	const styles = root.querySelectorAll('style');
	const pageGroups = root.querySelectorAll('g.typst-page');
	const serializer = new XMLSerializer();

	return Array.from(pageGroups).map((pageG) => {
		const w = pageG.getAttribute('data-page-width') || '595';
		const h = pageG.getAttribute('data-page-height') || '842';

		const pageSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		pageSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		pageSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		pageSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
		pageSvg.setAttribute('width', w);
		pageSvg.setAttribute('height', h);

		for (const def of defs) pageSvg.appendChild(def.cloneNode(true));
		for (const style of styles) pageSvg.appendChild(style.cloneNode(true));

		const cloned = pageG.cloneNode(true) as SVGGElement;
		cloned.setAttribute('transform', 'translate(0, 0)');
		pageSvg.appendChild(cloned);

		return serializer.serializeToString(pageSvg);
	});
}

/**
 * Extract only the first page from a composite SVG.
 * Useful when a single-page compilation overflows.
 */
export function extractFirstPageSvg(svgString: string): string {
	const pages = extractPageSvgs(svgString);
	return pages[0] || svgString;
}
