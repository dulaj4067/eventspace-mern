const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath);
        } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
            let content = fs.readFileSync(dirPath, 'utf8');
            let updated = content.replace(/process\.env\.REACT_APP_API_URL \|\| ''/g, "process.env.REACT_APP_API_URL || 'https://eventspace-mern-production.up.railway.app'");
            if (content !== updated) {
                fs.writeFileSync(dirPath, updated, 'utf8');
                console.log(`Updated ${dirPath}`);
            }
        }
    });
}

walkDir(srcDir);
