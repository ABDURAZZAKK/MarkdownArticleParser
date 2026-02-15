import { MarkdownArticleParser } from "./readability.ts";
import { Logger } from './utils/logger.ts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';




/* ---------------------------------------------
   Данные для демо 1
--------------------------------------------- */
const sampleHTML = `
<!DOCTYPE html>
<html>
<head>
<title>Пример статьи о TypeScript</title>
<meta name="author" content="John Doe">
</head>
<body>
<article>
<h1>Введение в TypeScript</h1>
<p class="author">Автор: John Doe</p>
<div class="content">
<h1> header </h1>
<h2> header </h2>
<h3> header </h3>
<p>TypeScript - это надмножество JavaScript, которое добавляет статическую типизацию.</p>
<p><a href="https://iana.org/domains/example">Learn more</a></p>
<img class="ft-c-header__search-icon" src="https://blog.mozilla.org/wp-content/themes/foxtail/assets/images/icons/search.svg" alt="search">
<code>
[x for x in range(10)]
</code>
<p>Он помогает писать более надёжный и поддерживаемый код.</p>
<p>Основные особенности TypeScript включают:</p>
<ul>
<li>Статическая типизация</li>
<li>Поддержка современных возможностей ES6+</li>
<li>Отличная интеграция с редакторами кода</li>
<li>Постепенная миграция из JavaScript</li>
</ul>
</div>
</article>
</body>
</html>
`;

/* ---------------------------------------------
   Функция – Демонстрация 1: Парсинг строки HTML
--------------------------------------------- */
function demoParseHtmlString(parser: MarkdownArticleParser) {
  Logger.info('\n=== Демонстрация 1: Парсинг HTML строки ===');
  const htmlResult = parser.parseFromHTML(sampleHTML, 'http://example.com/typescript-article');
  if (htmlResult) {
    Logger.success('HTML parsing completed!');
    console.log(htmlResult.mdContent);
    console.log('📖 Title:', htmlResult.title);
    console.log('👤 Author:', htmlResult.author);
    console.log('📊 Word count:', htmlResult.wordCount);
    console.log('⏱️   Reading time:', htmlResult.readingTime, 'minutes');
    console.log('🔤 Excerpt:', htmlResult.excerpt.substring(0, 100) + '...');
  }
}

/* ---------------------------------------------
   Функция – Демонстрация 2: Парсинг реальных URL
--------------------------------------------- */
// async function demoParseRealUrls(parser: MarkdownArticleParser) {
//   Logger.info('\n=== Демонстрация 2: Парсинг реальных URL ===');
//   const testURLs = [
//     'https://habr.com/ru/articles/955488/',
//     'https://example.com',
//     'https://blog.mozilla.org/en/',
//     'https://en.wikipedia.org/wiki/Wiki',
//   ];

//   // Обработка реальных URL
//   try {
//     const urlResults = await parser.parseMultipleURLs(testURLs);
//     urlResults.forEach((result, index) => {
//       if (result) {
//         Logger.success(`\n--- Result ${index + 1} ---`);
//         Logger.info('URL:', result.url);
//         Logger.info('Title:', result.title);
//         Logger.info('Site:', result.siteName);
//         Logger.info('Words:', result.wordCount);
//         Logger.info('Reading time:', result.readingTime, 'min');
//         saveToJSONFile(result, result.title);
//       }
//     });
//   } catch (error) {
//     Logger.error('Error in URL parsing demo:', error);
//   }

//   // Дополнительно: чтение локальных HTML‑файлов из каталога test_html

// }

function readTestFiles(parser: MarkdownArticleParser) {
  const testHTMLDir = 'test_html';
  const testHTMLs = fs.readdirSync(testHTMLDir);
  testHTMLs.forEach((filename) => {
    const readFile = path.join(testHTMLDir, filename);
    fs.readFile(readFile, 'utf-8', (err, data) => {
      if (err) {
        Logger.error('Error in read file:', err);
      } else {
        const htmlResult = parser.parseFromHTML(data, 'http://example.com/typescript-article');
        saveToJSONFile(htmlResult, htmlResult?.title);
      }
    });
  });
}

/* ---------------------------------------------
   Основная логика приложения
--------------------------------------------- */
async function main() {
  Logger.info('Starting Readability TypeScript Demo');

  const parser = new MarkdownArticleParser();

  // Вызов демо‑функций
  demoParseHtmlString(parser);
  readTestFiles(parser);
  // await demoParseRealUrls(parser);

  Logger.success('\n=== Demo completed successfully! ===');
}

/* ---------------------------------------------
   Обработка ошибок
--------------------------------------------- */
process.on('unhandledRejection', (error) => {
  Logger.error('Unhandled promise rejection:', error);
  process.exit(1);
});

/* ---------------------------------------------
   Запуск
--------------------------------------------- */
main().catch((error) => {
  Logger.error('Application error:', error);
  process.exit(1);
});

/* ---------------------------------------------
   Вспомогательная функция – запись в JSON
--------------------------------------------- */
function saveToJSONFile(htmlResult: any, filename: string = 'article-result.json') {
  if (!htmlResult) return;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const outputDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, filename.replace(/ /g, '_') + '.json');
  const res = JSON.stringify(htmlResult, null, 2);
  fs.appendFileSync(outputFile, res);
  Logger.success(`Results saved to: ${outputFile}`);
}