import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ReadabilityResult, ReadabilityOptions, ArticleInfo } from './types';
import { Logger } from './utils/logger';

export class MarkdownArticleParser {
  private options: ReadabilityOptions;
  private imgFormats = ['jpg','jpeg', 'png', 'gif', 'tiff', 'webp', 'svg', 'pdf']

  constructor(options: ReadabilityOptions = {}) {
    this.options = {
      // nbTopCandidates: 5,
      // charThreshold: 500,
      keepClasses: false,
      disableJSONLD: false,
      ...options
    };
  }

  /**
   * Парсинг HTML строки
   */
  parseFromHTML(html: string, url: string = ''): ArticleInfo | null {
    try {
      const dom = new JSDOM(html, {
        url: url || 'http://example.com',
        contentType: 'text/html'
      });

      return this.parseDocument(dom.window.document, url);
    } catch (error) {
      Logger.error('Error parsing HTML:', error);
      return null;
    }
  }

  /**
   * Парсинг URL (загрузка страницы)
   */
  async parseFromURL(url: string): Promise<ArticleInfo | null> {
    try {
      Logger.info(`Fetching content from: ${url}`);
      
      const dom = await JSDOM.fromURL(url);

      return this.parseDocument(dom.window.document, url);
    } catch (error) {
      Logger.error(`Error fetching URL ${url}:`, error);
      return null;
    }
  }

  /**
   * Парсинг документа
   */
  private parseDocument(doc: Document, url: string): ArticleInfo | null {
    try {
      // Создаем копию документа для Readability
      const proccedDoc = this.procces(doc); 
      // const proccedDoc = doc.cloneNode(true) as Document;
      const reader = new Readability(proccedDoc, this.options);

      const article = reader.parse();
      if (article?.textContent) 
        article.textContent = article.textContent.replace(/^(\s*)/gm, '')

      if (!article) {
        Logger.warn('No article content found');
        return null;
      }

      return this.formatArticleInfo(article, url);
    } catch (error) {
      Logger.error('Error parsing document:', error);
      return null;
    }
  }

  private procces(doc: Document): Document {
    const documentClone = doc.cloneNode(true) as Document;

    this.proccesImages(documentClone, "a")
    this.proccesImages(documentClone, "img")
    this.proccesCode(documentClone)
    this.proccesLists(documentClone)
    this.proccesHeaders(documentClone)
    this.proccesEm(documentClone)
    this.proccesStrong(documentClone)
    
    return documentClone;
  }

  private proccesImages(doc: Document, tag: any) {
    doc.querySelectorAll(tag).forEach(link => {
      let href;
      if (link.hasAttribute('href')){
        href = link.getAttribute('href')
      } else if (link.hasAttribute('src')) {
        href = link.getAttribute('src')
      } else return;
      const span = doc.createElement('p');

      let isIMG = false
      
      const linkSplited = href.split('.')
      if (this.imgFormats.includes(linkSplited[linkSplited.length-1])) {
        isIMG = true
      }
      let txt = link.text
      if (txt){
        txt = txt.trim().replace(/\s+/g, ' ')
        if (isIMG)
          span.textContent =  `\n![${txt}](${href})\n`
        else
          span.textContent =  ` [${txt}](${href}) `
      }
      else{
        if (isIMG)
          span.textContent =  `\n![](${href})\n`
        else
          span.textContent =  ` ${href} `
      }
      link.parentNode?.replaceChild(span, link)
    }); 
  }

  private proccesCode(doc: Document) {
    doc.querySelectorAll('code').forEach(code => {
      code.textContent = '\n```\n' + code.textContent + '\n```\n'
    }); 
  }

  private proccesLists(doc: Document) {
    doc.querySelectorAll('li').forEach(li => {
      li.textContent = "- " + li.textContent
    }); 
  }

  private proccesHeaders(doc: Document) {
    for (let i = 1; i <= 5; i++) {
      const tag = "h"+i
      doc.querySelectorAll(tag).forEach(t => {
      t.textContent = `\n${"#".repeat(i)} ${t.textContent.trim()}\n`
    }); 
    }
  }
  private proccesEm(doc: Document) {
      doc.querySelectorAll("em").forEach(t => {
      t.textContent = ` *${t.textContent.trim()}* `
    });     
  }
  private proccesStrong(doc: Document) {
      doc.querySelectorAll("strong").forEach(t => {
      t.textContent = ` **${t.textContent.trim()}** `
    });     
  }

  /**
   * Форматирование результата
   */
  private formatArticleInfo(article: any, url: string): ArticleInfo {
    const wordCount = this.countWords(article.textContent);
    const readingTime = this.calculateReadingTime(wordCount);

    return {
      url,
      title: article.title || 'No title',
      excerpt: article.excerpt || '',
      htmlContent: article.content || '',
      mdContent: article.textContent || '',
      wordCount,
      readingTime,
      siteName: article.siteName || '',
      author: article.byline || '',
      language: article.lang || 'en',
      timestamp: new Date()
    };
  }

  /**
   * Подсчет слов
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Расчет времени чтения (слова в минуту)
   */
  private calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Пакетная обработка URL
   */
  async parseMultipleURLs(urls: string[]): Promise<(ArticleInfo | null)[]> {
    Logger.info(`Processing ${urls.length} URLs...`);
    
    const results = await Promise.all(
      urls.map(async (url, index) => {
        Logger.info(`Processing URL ${index + 1}/${urls.length}: ${url}`);
        const result = await this.parseFromURL(url);
        
        if (result) {
          Logger.success(`Processed: ${result.title}`);
        } else {
          Logger.warn(`Failed to process: ${url}`);
        }
        
        return result;
      })
    );

    const successfulResults = results.filter(result => result !== null);
    Logger.success(`Successfully processed ${successfulResults.length}/${urls.length} articles`);

    return results;
  }
}