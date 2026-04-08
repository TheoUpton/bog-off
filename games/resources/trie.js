export class TrieBuilder{
    #root = new Trie();
    build(){return this.#root;}
    /**@param {string} word */
    addWord(word){
        if(!word || word.length == 0) return this;
        /**@type {Trie} */
        let currentTrie = this.#root;
        for(let char of word){
            if(!currentTrie.get(char)) currentTrie._set(char, new Trie());
            currentTrie = currentTrie.get(char);
        }
        currentTrie._isWord = true;
        return this;
    }
}
export class Trie{
    /**@type {Map<any, Trie>} */
    #map = new Map();
    get(key){return this.#map.get(key);}
    hasMore(){return this.#map.size != 0;}
    _isWord = false;
    isWord(){return this._isWord;}
    _set(key, trie){this.#map.set(key, trie);}
}
export class TrieCombiner{
    #tries;
    /**@param  {...Trie} tries */
    constructor(...tries){
        this.#tries = tries;
    }
    get(key){
        const tries = this.#tries.map(trie => trie?.get(key)).filter(elem => elem!==undefined);
        return tries.size >0 ? new TrieCombiner(...tries) : undefined;
    }
    hasMore(){return this.#tries.some(trie => trie.hasMore());}
    isWord(){return this.#tries.some(trie => trie.isWord());}
}