#!/usr/bin/env tsx
/**
 * Discover URL patterns in provider documentation.
 * Analyzes HTML structure to identify consistent URL patterns for model links.
 * 
 * Usage: npm run discover-patterns <provider-docs-url>
 * 
 * Example:
 *   npm run discover-patterns https://docs.aws.amazon.com/bedrock/latest/userguide/
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

interface PatternMatch {
  pattern: string;
  count: number;
  examples: string[];
}

async function discoverPatterns(baseUrl: string) {
  console.log(`🔍 Discovering URL patterns from: ${baseUrl}\n`);
  
  try {
    const response = await axios.get(baseUrl, { 
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    
    const $ = cheerio.load(response.data);
    const patterns = new Map<string, PatternMatch>();
    
    // Keywords that suggest model-related links
    const modelKeywords = [
      'model', 'gpt', 'claude', 'gemini', 'llama', 'mistral', 
      'anthropic', 'meta', 'google', 'openai', 'ai', 'ml'
    ];
    
    // Find all links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      
      if (!href) return;
      
      // Check if link is model-related
      const isModelRelated = modelKeywords.some(keyword => 
        href.toLowerCase().includes(keyword) || text.includes(keyword)
      );
      
      if (!isModelRelated) return;
      
      // Normalize the URL pattern
      const pattern = normalizePattern(href);
      
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          pattern,
          count: 0,
          examples: [],
        });
      }
      
      const match = patterns.get(pattern)!;
      match.count++;
      
      // Store up to 3 examples
      if (match.examples.length < 3 && !match.examples.includes(href)) {
        match.examples.push(href);
      }
    });
    
    // Sort by frequency
    const sorted = Array.from(patterns.values())
      .sort((a, b) => b.count - a.count);
    
    console.log('📋 Discovered URL Patterns:\n');
    
    if (sorted.length === 0) {
      console.log('   No model-related patterns found.');
      console.log('   Try inspecting the page manually or adjusting keywords.');
      return;
    }
    
    sorted.forEach((match, index) => {
      console.log(`${index + 1}. Pattern: ${match.pattern}`);
      console.log(`   Frequency: ${match.count} occurrence(s)`);
      console.log(`   Examples:`);
      match.examples.forEach(ex => console.log(`     - ${ex}`));
      console.log('');
    });
    
    // Additional analysis
    console.log('💡 Insights:\n');
    
    const hasVersionPlaceholder = sorted.some(p => p.pattern.includes('{version}'));
    const hasModelPlaceholder = sorted.some(p => p.pattern.includes('{model}'));
    const hasAnchorPattern = sorted.some(p => p.pattern.includes('#'));
    
    if (hasVersionPlaceholder) {
      console.log('   ✓ Version-based URLs detected (e.g., /v1/, /2-5-flash/)');
    }
    if (hasModelPlaceholder) {
      console.log('   ✓ Model-specific paths detected (e.g., /models/{model}/)');
    }
    if (hasAnchorPattern) {
      console.log('   ✓ Anchor-based links detected (e.g., #model-name)');
    }
    
    if (!hasVersionPlaceholder && !hasModelPlaceholder && !hasAnchorPattern) {
      console.log('   ⚠ No clear patterns detected. Manual investigation recommended.');
    }
    
  } catch (error: any) {
    console.error(`❌ Error fetching URL: ${error.message}`);
    process.exit(1);
  }
}

function normalizePattern(href: string): string {
  let pattern = href;
  
  // Replace version numbers (1.0, 2.5, etc.)
  pattern = pattern.replace(/\d+\.\d+/g, '{version}');
  pattern = pattern.replace(/\d+-\d+/g, '{version}');
  pattern = pattern.replace(/v\d+/g, 'v{version}');
  
  // Replace specific model IDs (alphanumeric with hyphens)
  pattern = pattern.replace(/\/([a-z0-9-]{10,})(?=\/|$)/g, '/{model-id}');
  
  // Replace HTML files
  pattern = pattern.replace(/[a-z0-9-]+\.html/g, '{page}.html');
  
  // Replace model family names
  pattern = pattern.replace(/\/(gpt|claude|gemini|llama|mistral|palm|bard)-[a-z0-9-]+/gi, '/{model-family}');
  
  // Keep anchors as-is but generalize the content after #
  pattern = pattern.replace(/#[a-z0-9-]+/g, (match) => {
    if (match.includes('model') || match.includes('gpt') || match.includes('claude')) {
      return '#{model-anchor}';
    }
    return match;
  });
  
  return pattern;
}

async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error('❌ Usage: npm run discover-patterns <url>');
    console.error('\nExample:');
    console.error('  npm run discover-patterns https://docs.aws.amazon.com/bedrock/latest/userguide/');
    process.exit(1);
  }
  
  await discoverPatterns(url);
}

main().catch(console.error);
