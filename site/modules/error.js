import fs from 'fs'
import path, {dirname} from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function errorPage(code, msg) {
    return (fs.readFileSync(path.join(__dirname, "..", "pages", "error.html")).toString("utf8"))
        .replaceAll("__insert_error_message_here", msg)
        .replaceAll("__insert_error_code_here", code);

};

export default errorPage