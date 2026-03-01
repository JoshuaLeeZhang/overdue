/**
 * Writing-style analyzer: takes raw text(s), returns a simple profile for the pipeline.
 * Profile: tone hint, avg sentence/paragraph length, vocabulary level hint, optional excerpts.
 */

export interface TextStats {
	wordCount: number;
	sentenceCount: number;
	paragraphCount: number;
	avgSentenceLength: number;
	avgParagraphLength: number;
	avgWordLength: number;
	tone: "formal" | "casual" | "neutral";
}

export interface WritingStyleProfile {
	summary: string;
	stats: {
		tone: string;
		avgSentenceLength: number;
		avgParagraphLength: number;
		wordCount: number;
	} | null;
	excerpts?: string[];
}

function analyzeText(text: string | null | undefined): TextStats | null {
	if (!text || typeof text !== "string") return null;
	const trimmed = text.trim();
	if (!trimmed.length) return null;

	const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
	const paragraphs = trimmed
		.split(/\n\s*\n/)
		.filter((p) => p.trim().length > 0);
	const words = trimmed.split(/\s+/).filter(Boolean);

	const avgSentenceLength = sentences.length
		? words.length / sentences.length
		: 0;
	const avgParagraphLength = paragraphs.length
		? sentences.length / paragraphs.length
		: 0;
	const avgWordLength = words.length
		? words.reduce((sum, w) => sum + w.length, 0) / words.length
		: 0;

	const formalMarkers =
		/\b(therefore|however|furthermore|moreover|thus|hence|accordingly)\b/gi;
	const casualMarkers =
		/\b(pretty|kinda|gonna|wanna|gotta|yeah|okay|stuff|things)\b/gi;
	const formalCount = (trimmed.match(formalMarkers) || []).length;
	const casualCount = (trimmed.match(casualMarkers) || []).length;
	const tone: TextStats["tone"] =
		formalCount > casualCount
			? "formal"
			: casualCount > formalCount
				? "casual"
				: "neutral";

	return {
		wordCount: words.length,
		sentenceCount: sentences.length,
		paragraphCount: paragraphs.length,
		avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
		avgParagraphLength: Math.round(avgParagraphLength * 10) / 10,
		avgWordLength: Math.round(avgWordLength * 10) / 10,
		tone,
	};
}

/**
 * @param textChunks - One or more raw text strings (e.g. from docs)
 * @returns writing-style profile
 */
export function getWritingStyleProfile(
	textChunks: string | string[],
): WritingStyleProfile {
	const inputs = Array.isArray(textChunks) ? textChunks : [textChunks];
	const valid = inputs.filter(
		(t) => t && typeof t === "string" && t.trim().length > 0,
	);
	if (valid.length === 0) {
		return {
			summary: "No text provided for style analysis.",
			stats: null,
		};
	}

	const combined = valid.join("\n\n");
	const stats = analyzeText(combined);
	if (!stats) {
		return { summary: "Could not analyze style.", stats: null };
	}

	const excerpts = valid
		.slice(0, 3)
		.map((t) => t.slice(0, 300).trim() + (t.length > 300 ? "..." : ""));
	const summary = [
		`Tone: ${stats.tone}`,
		`Avg sentence length: ${stats.avgSentenceLength} words`,
		`Avg paragraph length: ${stats.avgParagraphLength} sentences`,
		`Word count (combined): ${stats.wordCount}`,
	].join("; ");

	return {
		summary,
		stats: {
			tone: stats.tone,
			avgSentenceLength: stats.avgSentenceLength,
			avgParagraphLength: stats.avgParagraphLength,
			wordCount: stats.wordCount,
		},
		excerpts,
	};
}

export { analyzeText };
