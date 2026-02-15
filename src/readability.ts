// readability.ts
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import type { ArticleInfo, ReadabilityOptions } from './types';
import { Logger } from './utils/logger.ts';
import request from 'request';
import { promisify } from 'util';

const requestPromise = promisify(request);

export class MarkdownArticleParser {
  private options: ReadabilityOptions;
  private imgFormats = ['jpg','jpeg', 'png', 'gif', 'tiff', 'webp', 'svg', 'pdf'];

  constructor(options: ReadabilityOptions = {}) {
    this.options = {
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
      // Парсим HTML с помощью linkedom
      const { document } = parseHTML(html);
      
      // Устанавливаем URL для документа (если нужно)
      if (url && document) {
        Object.defineProperty(document, 'URL', {
          value: url,
          writable: false
        });
      }

      return this.parseDocument(document, url);
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
      
      const response = await requestPromise({
        url: url,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArticleParser/1.0; +http://example.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        gzip: true,
        followRedirect: true,
        maxRedirects: 5,
        timeout: 30000,
        encoding: 'utf8'
      });

      if (response.statusCode !== 200) {
        throw new Error(`HTTP error! status: ${response.statusCode}`);
      }

      const html = response.body;
      return this.parseFromHTML(html, url);
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
      const processedDoc = this.process(doc); 
      const reader = new Readability(processedDoc, this.options);

      const article = reader.parse();
      if (article?.textContent) {
        article.textContent = article.textContent.replace(/^(\s*)/gm, '');
      }

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

  private process(doc: Document): Document {
    const documentClone = doc.cloneNode(true) as Document;

    this.processImages(documentClone, "a");
    this.processImages(documentClone, "img");
    this.processTables(documentClone);
    this.processStrong(documentClone);
    this.processEm(documentClone);
    
    this.processCodeBlock(documentClone);
    this.processCode(documentClone);
    this.processLists(documentClone);
    this.processHeaders(documentClone);
    this.processP(documentClone);
    
    return documentClone;
  }

  private processImages(doc: Document, tag: string): void {
    doc.querySelectorAll(tag).forEach(link => {
      let href: string | null = null;
      if (link.hasAttribute('href')){
        href = link.getAttribute('href');
      } else if (link.hasAttribute('src')) {
        href = link.getAttribute('src');
      } else return;
      
      const span = doc.createElement('p');
      let isIMG = false;
      
      if (href) {
        const linkSplited = href.split('.');
        const extension = linkSplited[linkSplited.length - 1].toLowerCase();
        if (this.imgFormats.includes(extension)) {
          isIMG = true;
        }
      }
      
      let txt = link.textContent;
      if (txt){
        txt = txt.trim().replace(/\s+/g, ' ');
        if (isIMG && href) {
          span.textContent = `\n![${txt}](${href})\n`;
        } else if (href) {
          span.textContent = ` [${txt}](${href}) `;
        }
      } else {
        if (isIMG && href) {
          span.textContent = `\n![](${href})\n`;
        } else if (href) {
          span.textContent = ` ${href} `;
        }
      }
      link.parentNode?.replaceChild(span, link);
    }); 
  }

  private processTables(doc: Document): void {
    doc.querySelectorAll('table').forEach(table => {
      if (!table) return;
      const rows = table.querySelectorAll('tr');
      const markdownRows: string[] = [];
      
      rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('th, td');
          const cellTexts: string[] = [];
          
          cells.forEach(cell => {
              // Очищаем текст от внутренних тегов и лишних пробелов
              const text = cell.textContent?.trim().replace(/\s+/g, ' ') || '';
              cellTexts.push(text);
          });
          
          // Создаем строку таблицы
          markdownRows.push(`| ${cellTexts.join(' | ')} |`);
          
          // Добавляем разделитель после заголовков
          if (rowIndex === 0 && row.querySelector('th')) {
              const separators = cellTexts.map(() => '---');
              markdownRows.push(`| ${separators.join(' | ')} |`);
          }
      });
      const newElement = doc.createElement("span");
      newElement.textContent = '\n```\n' + markdownRows.join('\n') + '\n```\n';
      table.parentNode?.replaceChild(newElement, table);
      })
  }
  

  private processCodeBlock(doc: Document): void {
    doc.querySelectorAll('pre').forEach(pre => {
      const code = pre.querySelector('code') 
      if (code) {
        const pl = code.getAttribute("class")
        const sep = '\n```'
        pre.textContent = `${sep}${pl}\n${pre.textContent || ''}${sep}\n`;
      }
    }); 
  }

  private processCode(doc: Document): void {
    doc.querySelectorAll('code').forEach(code => {
      code.textContent = '`' + (code.textContent || '') + '`';
    }); 
  }

  private processLists(doc: Document): void {
    doc.querySelectorAll('li').forEach(li => {
      li.textContent = "- " + (li.textContent || '');
    }); 
  }

  private processHeaders(doc: Document): void {
    for (let i = 1; i <= 5; i++) {
      const tag = "h" + i;
      doc.querySelectorAll(tag).forEach(t => {
        t.textContent = `\n${"#".repeat(i)} ${t.textContent?.trim() || ''}\n`;
      }); 
    }
  }

  private processP(doc: Document): void {
      doc.querySelectorAll("p").forEach(p => {
        p.textContent = `<br>${p.textContent?.trim().split(/\s+/).join(" ") || ''}<br>`;
      }); 
    
  }

  private processEm(doc: Document): void {
    doc.querySelectorAll("em").forEach(t => {
      t.textContent = ` *${t.textContent?.trim() || ''}* `;
    });     
  }

  private processStrong(doc: Document): void {
    doc.querySelectorAll("strong").forEach(t => {
      t.textContent = ` **${t.textContent?.trim() || ''}** `;
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
    if (!text) return 0;
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