import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname, resolve} from 'path';

import { TrieBuilder } from "./trie.js";

const builders = {
    _16: new TrieBuilder(),
    _25: new TrieBuilder(),
    _36: new TrieBuilder()
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const path =  resolve(__dirname, "./eng.txt")
const text = fs.readFileSync(path, { encoding: 'utf8' });

for(const word of text.split("\r\n")){
    if(word.length<3) continue;
    if(word.length <=16) builders._16.addWord(word);
    else if(word.length <=25) builders._25.addWord(word);
    else if(word.length <=36) builders._36.addWord(word);
}

export const dictionaries = {
    _16: builders._16.build(),
    _25: builders._25.build(),
    _36: builders._36.build()
}