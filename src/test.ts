import * as fs from 'fs';
import * as path from 'path';

function main(){
    const outputDir = path.join(__dirname, '..', 'out');
    const filenames = [
        'Эмуляция_«тетриса»_Apollo_из_90-х_и_запуск_кода_на_оригинальном_железе',
        'Example_Domain',
        'The_Mozilla_Blog',
        'Пример_статьи_о_TypeScript',
        "Wiki_-_Wikipedia",
        'Wiki'
        ];
    filenames.forEach((filename, idx) => {
    const targetFilePath = path.join(outputDir, filename+".json")
    if (fs.existsSync(targetFilePath))
    fs.readFile(targetFilePath, "utf8", (err,data) => {
        if (err) {
            console.error(err)
        }

        // console.log(data)
        const jsonObject = JSON.parse(data);

        
        const outputFile = path.join(outputDir, filename+".md");
        
        fs.writeFileSync(outputFile, jsonObject["mdContent"])
    })
    })

}

main()