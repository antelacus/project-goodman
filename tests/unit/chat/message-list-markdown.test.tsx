// The answer bubble renders the syntax the model writes: GFM tables, and bold that
// closes after Chinese punctuation.

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import MessageList from '@/components/chat/MessageList';

vi.mock('katex/dist/katex.min.css', () => ({}));

const render = (content: string) =>
  renderToStaticMarkup(createElement(MessageList, { messages: [{ role: 'assistant', content }] }));

describe('answer Markdown on the page', () => {
  it('renders a GFM table as a table, not as pipes', () => {
    const html = render('| 事项 | 金额 |\n|---|---|\n| 违约金上限 | 5,000 元 |');
    expect(html).toContain('<table');
    expect(html).toMatch(/<td[^>]*>违约金上限<\/td>/);
    expect(html).not.toContain('|---|');
  });

  it('closes bold after Chinese punctuation', () => {
    const html = render('**可以约定计算方法和上限。**当事人可以约定违约金。');
    expect(html).toContain('<strong>可以约定计算方法和上限。</strong>当事人');
    expect(html).not.toContain('**');
  });
});
