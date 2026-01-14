import {
    unified
} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeMermaid from 'rehype-mermaid';
import rehypeStringify from 'rehype-stringify';

async function renderMarkdown(markdownContent) {
    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeHighlight)
        .use(rehypeMermaid, {
            strategy: 'pre-mermaid',
        })
        .use(rehypeStringify)
        .process(markdownContent);

    return String(file);
}

export default renderMarkdown
