export interface ReadabilityResult {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime?: string;
}

export interface ReadabilityOptions {
  debug?: boolean;
  maxElemsToParse?: number;
  nbTopCandidates?: number;
  charThreshold?: number;
  classesToPreserve?: string[];
  keepClasses?: boolean;
  serializer?: (node: Node) => string;
  disableJSONLD?: boolean;
  allowedVideoRegex?: RegExp;
  linkDensityModifier?: number;
}

export interface ArticleInfo {
  url: string;
  title: string;
  excerpt: string;
  htmlContent: string;
  mdContent: string;
  wordCount: number;
  readingTime: number;
  siteName: string;
  author: string;
  language: string;
  timestamp: Date;
}