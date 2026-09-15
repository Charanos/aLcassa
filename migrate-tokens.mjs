import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const tokenMap = {
  // Surfaces
  'var(--surface-page)': 'var(--surface-base)',
  'var(--surface-well)': 'var(--surface-raised)',
  'var(--surface-invert)': 'var(--ink-900)',
  'var(--surface-hover)': 'var(--surface-inset)',

  // Rules
  'var(--rule-soft)': 'var(--ink-100)',
  'var(--rule-base)': 'var(--border-subtle)',
  'var(--rule-strong)': 'var(--border-strong)',

  // Inks
  'var(--ink-primary)': 'var(--text-primary)',
  'var(--ink-secondary)': 'var(--text-secondary)',
  'var(--ink-tertiary)': 'var(--text-tertiary)',
  'var(--ink-faint)': 'var(--ink-300)',
  'var(--ink-inverse)': 'var(--text-inverse)',

  // Copper -> Blue
  'var(--copper-ink)': 'var(--blue-500)',
  'var(--copper-solid)': 'var(--blue-500)',
  'var(--copper-tint)': 'var(--blue-50)',
  'var(--copper-rule)': 'var(--blue-200)',

  // Verdigris -> Green
  'var(--verdigris-ink)': 'var(--green-500)',
  'var(--verdigris-solid)': 'var(--green-500)',
  'var(--verdigris-tint)': 'var(--green-100)',
  'var(--verdigris-rule)': 'color-mix(in oklab, var(--green-500) 38%, var(--surface-base))',

  // Ochre -> Amber
  'var(--ochre-ink)': 'var(--amber-500)',
  'var(--ochre-solid)': 'var(--amber-500)',
  'var(--ochre-tint)': 'var(--amber-100)',
  'var(--ochre-rule)': 'color-mix(in oklab, var(--amber-500) 38%, var(--surface-base))',

  // Oxide -> Red
  'var(--oxide-ink)': 'var(--red-500)',
  'var(--oxide-solid)': 'var(--red-500)',
  'var(--oxide-tint)': 'var(--red-100)',
  'var(--oxide-rule)': 'color-mix(in oklab, var(--red-500) 38%, var(--surface-base))',

  // Slate -> Ink
  'var(--slate-ink)': 'var(--ink-600)',
  'var(--slate-solid)': 'var(--ink-600)',
  'var(--slate-tint)': 'var(--ink-50)',
  'var(--slate-rule)': 'var(--ink-300)',

  // Graphite -> Ink
  'var(--graphite-ink)': 'var(--ink-500)',
  'var(--graphite-solid)': 'var(--ink-500)',
  'var(--graphite-tint)': 'var(--ink-100)',
  'var(--graphite-rule)': 'var(--ink-300)',

  // Interaction
  'var(--focus)': 'var(--border-focus)',
  'var(--selection-bg)': 'var(--blue-100)',
  'var(--selection-fg)': 'var(--ink-900)',
  'var(--scrim)': 'var(--surface-overlay)',

  // Disabled
  'var(--disabled-surface)': 'var(--ink-50)',
  'var(--disabled-rule)': 'var(--ink-200)',
  'var(--disabled-ink)': 'var(--text-disabled)',

  // Semantic
  'var(--text-body)': 'var(--text-secondary)',
  'var(--text-muted)': 'var(--text-tertiary)',
  'var(--text-placeholder)': 'var(--input-placeholder)',
  'var(--text-faint)': 'var(--ink-300)',
  'var(--text-brand)': 'var(--text-action)',

  // Borders
  'var(--border-default)': 'var(--border-subtle)',
  'var(--border-emphasis)': 'var(--border-strong)',

  // Actions
  'var(--action-primary-bg)': 'var(--button-primary-bg)',
  'var(--action-primary-fg)': 'var(--button-primary-fg)',
  'var(--action-primary-border)': 'var(--blue-600)',
  'var(--action-destructive-bg)': 'var(--button-danger-bg)',
  'var(--action-destructive-fg)': 'var(--button-danger-fg)',
  'var(--action-destructive-border)': 'var(--red-500)',
  'var(--action-quiet-fg)': 'var(--text-action)',
  'var(--action-quiet-hover-bg)': 'var(--blue-50)',
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
        results.push(filePath);
      }
    }
  });

  return results;
}

const files = walkDir(SRC_DIR);
let totalReplacements = 0;

files.forEach((file) => {
  if (file.endsWith('tokens.css')) return; // skip the tokens file itself

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [oldToken, newToken] of Object.entries(tokenMap)) {
    if (content.includes(oldToken)) {
      content = content.split(oldToken).join(newToken);
      changed = true;
      totalReplacements++;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log(`Migration complete. Made ${totalReplacements} replacements.`);
