import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import AboutPage from '@/app/(workspace)/about/page';
import packageJson from '../../../package.json';

describe('AboutPage', () => {
  it('renders the current app version from package.json', () => {
    const html = renderToStaticMarkup(React.createElement(AboutPage));

    expect(html).toContain(`当前版本：v${packageJson.version}`);
  });
});
