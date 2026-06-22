// src/intelligence/nlp.ts
// ─────────────────────────────────────────────────────────────────────────────
// Multi-Aspect Sentiment Analysis Engine for Maggino's (late-night, 11 PM–5 AM)
// Pure TypeScript · No external libraries · Keyword-based NLP with negation
// ─────────────────────────────────────────────────────────────────────────────

import type { Order } from '../types';

// ────────────────────────── Public Type Exports ──────────────────────────────

/** Sentiment polarity of a single review clause. */
export type SentimentStatus = 'Positive' | 'Negative' | 'Neutral';

/** Aspect categories that a review clause can be mapped to. */
export type AspectTopic =
  | 'Food Quality'
  | 'Delivery Time'
  | 'Packaging'
  | 'Portion Size'
  | 'Service'
  | 'Value for Money'
  | 'General';

/** A single aspect-level review extracted from an order item's feedback text. */
export interface ProcessedReview {
  orderId: string;
  itemName: string;
  originalText: string;
  topic: AspectTopic;
  status: SentimentStatus;
}

/** Aggregated positive / negative / neutral counts for one topic. */
export interface TopicSummary {
  topic: AspectTopic;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

/** A single hourly-issue bucket used for time-aware aggregation. */
export interface HourlyIssue {
  /** Human-readable hour label, e.g. "1 AM" or "12 AM" */
  hour: string;
  topic: string;
  count: number;
}

/** Complete insights payload returned to the dashboard. */
export interface ReviewInsights {
  biggestIssue: string;
  processedReviews: ProcessedReview[];
  topicSummary: TopicSummary[];
  hourlyIssues: HourlyIssue[];
  isUsingDemoData: boolean;
}

// ──────────────────────── Internal Keyword Dictionaries ──────────────────────

/**
 * Topic detection keywords.
 * Each topic maps to an array of lowercase tokens; if ANY token appears in
 * a clause the clause is assigned to that topic.  `General` acts as a fallback
 * and has no keywords.
 */
const TOPIC_KEYWORDS: Record<AspectTopic, string[]> = {
  'Food Quality': [
    'taste', 'flavor', 'flavour', 'delicious', 'cold', 'stale', 'yummy',
    'good', 'bad', 'burnt', 'raw', 'salty', 'spicy', 'bland', 'fresh',
    'crispy', 'soggy', 'overcooked', 'undercooked', 'perfect', 'amazing',
    'terrible', 'awesome', 'hot', 'warm', 'flavorful', 'flavourful',
    'cheesy', 'tasty', 'disgusting', 'dry', 'oily', 'greasy',
    'bomb', 'fire', 'slaps', 'bussin', 'delish', 'gross', 'nasty', 'mid', 'trash'
  ],
  'Delivery Time': [
    'delivery', 'late', 'time', 'fast', 'slow', 'wait', 'delayed', 'quick',
    'early', 'on-time', 'on time', 'prompt', 'took long', 'minutes',
    'forever', 'speed', 'arrived', 'eta', 'delay',
  ],
  'Packaging': [
    'box', 'spilled', 'packaging', 'messy', 'leak', 'leaked', 'leaking',
    'neat', 'packed', 'container', 'wrapper', 'broken', 'intact', 'sealed',
    'crushed', 'damaged', 'torn', 'wrap', 'bag',
  ],
  'Portion Size': [
    'portion', 'size', 'quantity', 'less', 'more', 'tiny', 'huge', 'small',
    'big', 'generous', 'enough', 'insufficient', 'filling', 'value',
    'amount', 'little', 'large', 'extra',
  ],
  'Service': [
    'service', 'staff', 'rude', 'polite', 'friendly', 'helpful',
    'responsive', 'attitude', 'behavior', 'behaviour', 'call', 'support',
    'communication', 'courteous', 'professional', 'unprofessional',
  ],
  'Value for Money': [
    'price', 'expensive', 'cheap', 'worth', 'overpriced', 'affordable',
    'reasonable', 'costly', 'money', 'pricing', 'rates', 'cost',
    'economical', 'budget',
  ],
  General: [],
};

/**
 * Sentiment polarity keywords.
 * Positive and Negative lists are used to score each clause.
 */
const SENTIMENT_KEYWORDS: Record<'Positive' | 'Negative', string[]> = {
  Positive: [
    'good', 'great', 'delicious', 'yummy', 'fast', 'quick', 'neat',
    'perfect', 'awesome', 'amazing', 'love', 'excellent', 'best',
    'fresh', 'crispy', 'tasty', 'flavorful', 'friendly', 'polite',
    'helpful', 'prompt', 'generous', 'filling', 'affordable',
    'reasonable', 'worth', 'sealed', 'intact', 'cheesy', 'nice',
    'super', 'wonderful', 'fantastic', 'happy', 'impressed', 'early',
    'on-time', 'on time', 'professional', 'courteous', 'economical',
    'hot', 'warm', 'bomb', 'fire', 'slaps', 'bussin', 'delish', 'perfection', 'fab',
  ],
  Negative: [
    'bad', 'cold', 'stale', 'late', 'slow', 'spilled', 'messy', 'leak',
    'leaked', 'leaking', 'bland', 'burnt', 'raw', 'salty', 'terrible',
    'worst', 'horrible', 'disgusting', 'soggy', 'overcooked',
    'undercooked', 'delayed', 'rude', 'tiny', 'insufficient',
    'expensive', 'overpriced', 'costly', 'crushed', 'damaged', 'broken',
    'torn', 'dry', 'oily', 'greasy', 'unprofessional', 'forever',
    'took long', 'small', 'gross', 'nasty', 'mid', 'trash', 'garbage', 'awful', 'rip off',
  ],
};

/**
 * Negation tokens that flip polarity when they precede a sentiment keyword
 * within a small window (≤ 3 words).
 */
const NEGATION_WORDS: string[] = [
  'not', 'no', 'never', "didn't", "wasn't", "don't", "doesn't",
  "weren't", "isn't", "couldn't", "won't", "shouldn't", "hadn't",
  'hardly', 'barely', 'neither', 'nor', 'without',
];

/**
 * Conjunctions used to split a review into independent clauses.
 * Each conjunction may signal a contrast ("but") or continuation ("and").
 */
const CLAUSE_SPLITTERS: RegExp =
  /\b(?:but|however|although|though|yet|while|whereas|nevertheless|except|unfortunately|fortunately|and)\b/i;

// ─────────────────────── Internal Helper Functions ───────────────────────────

/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j] + 1, // deletion
        matrix[i - 1][j - 1] + indicator // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Checks if a word fuzzy matches a keyword.
 * Exact match always returns true.
 * For words > 4 chars, allows 1 typo (distance <= 1).
 * For words > 7 chars, allows 2 typos (distance <= 2).
 */
function isFuzzyMatch(word: string, keyword: string): boolean {
  if (word === keyword) return true;
  // Don't fuzzy match very short words to avoid false positives
  if (word.length <= 4 || keyword.length <= 4) return false;
  
  const distance = levenshteinDistance(word, keyword);
  if (keyword.length > 7 && distance <= 2) return true;
  if (keyword.length > 4 && distance <= 1) return true;
  return false;
}

/**
 * Split a review string into independent clauses on conjunctions.
 * Returns at least one clause (the full text) if no splitter is found.
 */
function splitIntoClauses(text: string): string[] {
  const parts = text.split(CLAUSE_SPLITTERS).map(s => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

/**
 * Tokenize a clause into lowercase word tokens.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9'\- ]/g, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Detect the best-matching topic for a clause.
 * Returns 'General' when no topic keywords match.
 */
function detectTopic(clauseLower: string): AspectTopic {
  // Score each topic by counting keyword hits; pick the highest.
  let bestTopic: AspectTopic = 'General';
  let bestScore = 0;

  const topics = Object.keys(TOPIC_KEYWORDS) as AspectTopic[];
  const words = tokenize(clauseLower);
  
  for (const topic of topics) {
    if (topic === 'General') continue;
    const keywords = TOPIC_KEYWORDS[topic];
    let score = 0;
    
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (clauseLower.includes(kw)) score++;
      } else {
        for (const word of words) {
          if (isFuzzyMatch(word, kw)) {
            score++;
            break; // found this keyword in the clause
          }
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }
  return bestTopic;
}

/**
 * Score the sentiment of a clause, taking negation into account.
 *
 * Algorithm:
 * 1. Walk through words in the clause.
 * 2. Track a "negation window": if a negation word appears, the next 3 words
 *    have their polarity flipped.
 * 3. Tally positive and negative hits, then compare.
 *
 * Multi-word keywords (e.g. "took long", "on time") are checked separately
 * against the full clause string.
 */
function scoreSentiment(clauseLower: string): SentimentStatus {
  const words = tokenize(clauseLower);
  let posScore = 0;
  let negScore = 0;

  // ── Multi-word keyword pass ────────────────────────────────────────────
  const multiWordPositive = SENTIMENT_KEYWORDS.Positive.filter(kw => kw.includes(' '));
  const multiWordNegative = SENTIMENT_KEYWORDS.Negative.filter(kw => kw.includes(' '));

  for (const kw of multiWordPositive) {
    if (clauseLower.includes(kw)) {
      // Check for negation immediately before the multi-word keyword
      const idx = clauseLower.indexOf(kw);
      const prefix = clauseLower.slice(Math.max(0, idx - 20), idx).trim();
      const prefixWords = prefix.split(/\s+/);
      const lastPrefixWord = prefixWords[prefixWords.length - 1] || '';
      if (NEGATION_WORDS.includes(lastPrefixWord)) {
        negScore++;
      } else {
        posScore++;
      }
    }
  }
  for (const kw of multiWordNegative) {
    if (clauseLower.includes(kw)) {
      const idx = clauseLower.indexOf(kw);
      const prefix = clauseLower.slice(Math.max(0, idx - 20), idx).trim();
      const prefixWords = prefix.split(/\s+/);
      const lastPrefixWord = prefixWords[prefixWords.length - 1] || '';
      if (NEGATION_WORDS.includes(lastPrefixWord)) {
        posScore++;
      } else {
        negScore++;
      }
    }
  }

  // ── Single-word keyword pass with negation window ─────────────────────
  const singlePos = SENTIMENT_KEYWORDS.Positive.filter(kw => !kw.includes(' '));
  const singleNeg = SENTIMENT_KEYWORDS.Negative.filter(kw => !kw.includes(' '));

  let negationWindowRemaining = 0;

  for (const word of words) {
    // Check if this word is a negation trigger
    if (NEGATION_WORDS.includes(word)) {
      negationWindowRemaining = 3; // flip the next 3 tokens
      continue;
    }

    const isNegated = negationWindowRemaining > 0;

    let matchedPos = false;
    for (const kw of singlePos) {
      if (isFuzzyMatch(word, kw)) { matchedPos = true; break; }
    }
    
    let matchedNeg = false;
    if (!matchedPos) {
      for (const kw of singleNeg) {
        if (isFuzzyMatch(word, kw)) { matchedNeg = true; break; }
      }
    }

    if (matchedPos) {
      if (isNegated) { negScore++; } else { posScore++; }
    }
    if (matchedNeg) {
      if (isNegated) { posScore++; } else { negScore++; }
    }

    if (negationWindowRemaining > 0) negationWindowRemaining--;
  }

  if (posScore === 0 && negScore === 0) return 'Neutral';
  if (posScore > negScore) return 'Positive';
  if (negScore > posScore) return 'Negative';
  return 'Neutral'; // tie → Neutral
}

/**
 * Calibrate text-derived sentiment with a 1-5 star rating.
 * - 1-2 stars → bias toward Negative (override Neutral/Positive)
 * - 3 stars   → keep text-based analysis unchanged
 * - 4-5 stars → bias toward Positive (override Neutral/Negative)
 */
function calibrateWithRating(
  textSentiment: SentimentStatus,
  rating: number,
): SentimentStatus {
  if (rating <= 0 || rating > 5) return textSentiment; // no valid rating

  if (rating <= 2) {
    // Low star: text Positive is unlikely — override to Negative
    return textSentiment === 'Positive' ? 'Negative' : textSentiment === 'Neutral' ? 'Negative' : 'Negative';
  }
  if (rating >= 4) {
    // High star: text Negative is unlikely — override to Positive
    return textSentiment === 'Negative' ? 'Positive' : textSentiment === 'Neutral' ? 'Positive' : 'Positive';
  }
  // rating === 3 → trust the text
  return textSentiment;
}

/**
 * Convert a JS timestamp (ms) to a human-readable hour label.
 * Uses the restaurant's perspective (IST, or the local timezone of the runtime).
 *
 * Example outputs: "11 PM", "1 AM", "4 AM"
 */
function timestampToHourLabel(timestamp: number): string {
  const date = new Date(timestamp);
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours} ${ampm}`;
}

/**
 * Deduplicate topic+status pairs within a single clause analysis so that
 * we do not double-count when the same clause matches the same topic twice.
 */
function dedupeResults(
  results: { topic: AspectTopic; status: SentimentStatus }[],
): { topic: AspectTopic; status: SentimentStatus }[] {
  const seen = new Set<string>();
  const unique: { topic: AspectTopic; status: SentimentStatus }[] = [];
  for (const r of results) {
    const key = `${r.topic}::${r.status}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return unique;
}

// ──────────────────────── Public Exported Functions ──────────────────────────

/**
 * Analyze a raw review text string and extract **multiple** aspect-level
 * sentiment results.
 *
 * The text is split on conjunctions ("but", "however", "and", …) and each
 * resulting clause is independently analyzed for topic + sentiment.
 *
 * @param text  The raw feedback string from the customer.
 * @returns     Array of `{ topic, status }` — one entry per detected aspect.
 *
 * @example
 * ```ts
 * analyzeReviewText("Pizza was good but delivery was late");
 * // [
 * //   { topic: "Food Quality", status: "Positive" },
 * //   { topic: "Delivery Time", status: "Negative" },
 * // ]
 * ```
 */
export function analyzeReviewText(
  text: string,
): { topic: AspectTopic; status: SentimentStatus }[] {
  if (!text || text.trim().length === 0) {
    return [{ topic: 'General', status: 'Neutral' }];
  }

  const clauses = splitIntoClauses(text);
  const results: { topic: AspectTopic; status: SentimentStatus }[] = [];

  for (const clause of clauses) {
    const lower = clause.toLowerCase();
    const topic = detectTopic(lower);
    const status = scoreSentiment(lower);
    results.push({ topic, status });
  }

  // If every clause resolved to 'General' AND 'Neutral', return a single entry.
  const deduped = dedupeResults(results);
  return deduped.length > 0 ? deduped : [{ topic: 'General', status: 'Neutral' }];
}

/**
 * Build a complete `ReviewInsights` object from an array of orders.
 *
 * If fewer than 5 real reviews are available, the engine transparently switches
 * to demo mode — generating synthetic reviews so the dashboard always has
 * meaningful data to display.
 *
 * @param orders  The orders (with items containing `feedback` and `rating`).
 * @returns       Full insights payload including processed reviews, topic
 *                summaries, hourly issue aggregation, and the biggest-issue
 *                headline.
 */
export function generateReviewInsights(orders: Order[], isDemoMode?: boolean): ReviewInsights {
  const processedReviews: ProcessedReview[] = [];

  // ── Step 1: Extract aspect-level reviews from real order data ──────────
  for (const order of orders) {
    for (const item of order.items) {
      const feedbackText = (item.feedback ?? '').trim();
      if (feedbackText.length === 0) continue;

      const aspects = analyzeReviewText(feedbackText);

      for (const aspect of aspects) {
        // Calibrate sentiment with star rating when available
        const calibrated =
          item.rating > 0
            ? calibrateWithRating(aspect.status, item.rating)
            : aspect.status;

        processedReviews.push({
          orderId: order.displayId,
          itemName: item.name,
          originalText: feedbackText,
          topic: aspect.topic,
          status: calibrated,
        });
      }
    }
  }

  // ── Step 2: Demo-mode fallback ────────────────────────────────────────
  const isUsingDemoData = isDemoMode !== undefined ? isDemoMode : processedReviews.length < 5;
  const reviewsForAnalysis = isUsingDemoData
    ? [...generateDemoReviews(), ...processedReviews]
    : processedReviews;

  // ── Step 3: Build topic summaries ─────────────────────────────────────
  const topicSummary = buildTopicSummary(reviewsForAnalysis);

  // ── Step 4: Time-aware hourly issue aggregation ───────────────────────
  const hourlyIssues = isUsingDemoData
    ? buildDemoHourlyIssues()
    : buildHourlyIssues(orders, processedReviews);

  // ── Step 5: Determine biggest issue ───────────────────────────────────
  const biggestIssue = determineBiggestIssue(topicSummary, hourlyIssues);

  return {
    biggestIssue,
    processedReviews: reviewsForAnalysis.slice().reverse(), // latest first
    topicSummary,
    hourlyIssues,
    isUsingDemoData,
  };
}

// ──────────────── Topic Summary Builder ─────────────────────────────────────

/**
 * Aggregate an array of ProcessedReviews into per-topic positive/negative/neutral counts.
 */
function buildTopicSummary(reviews: ProcessedReview[]): TopicSummary[] {
  const allTopics: AspectTopic[] = [
    'Food Quality',
    'Delivery Time',
    'Packaging',
    'Portion Size',
    'Service',
    'Value for Money',
    'General',
  ];

  return allTopics.map(topic => {
    const matching = reviews.filter(r => r.topic === topic);
    return {
      topic,
      positive: matching.filter(r => r.status === 'Positive').length,
      negative: matching.filter(r => r.status === 'Negative').length,
      neutral: matching.filter(r => r.status === 'Neutral').length,
      total: matching.length,
    };
  });
}

// ──────────────── Hourly Issue Aggregation ───────────────────────────────────

/**
 * Group negative reviews by the hour they were placed (using `order.timestamp`).
 * Produces insight like "Delivery delays spike after 1 AM".
 *
 * Operating hours are 11 PM – 5 AM, so we focus on those hours.
 */
function buildHourlyIssues(
  orders: Order[],
  reviews: ProcessedReview[],
): HourlyIssue[] {
  // Map orderId → timestamp for lookup
  const orderTimestampMap = new Map<string, number>();
  for (const order of orders) {
    orderTimestampMap.set(order.displayId, order.timestamp);
  }

  // Bucket: hourLabel → topic → count
  const buckets = new Map<string, Map<string, number>>();

  for (const review of reviews) {
    if (review.status !== 'Negative') continue;
    const ts = orderTimestampMap.get(review.orderId);
    if (!ts) continue;

    const hourLabel = timestampToHourLabel(ts);
    if (!buckets.has(hourLabel)) {
      buckets.set(hourLabel, new Map<string, number>());
    }
    const topicMap = buckets.get(hourLabel)!;
    topicMap.set(review.topic, (topicMap.get(review.topic) ?? 0) + 1);
  }

  const issues: HourlyIssue[] = [];
  for (const [hour, topicMap] of buckets) {
    for (const [topic, count] of topicMap) {
      issues.push({ hour, topic, count });
    }
  }

  // Sort descending by count so the worst hours are first
  issues.sort((a, b) => b.count - a.count);
  return issues;
}

/**
 * Build demo hourly issues that illustrate typical late-night patterns.
 */
function buildDemoHourlyIssues(): HourlyIssue[] {
  return [
    { hour: '1 AM', topic: 'Delivery Time', count: 4 },
    { hour: '2 AM', topic: 'Delivery Time', count: 3 },
    { hour: '12 AM', topic: 'Food Quality', count: 2 },
    { hour: '3 AM', topic: 'Packaging', count: 1 },
    { hour: '11 PM', topic: 'Service', count: 1 },
  ];
}

// ──────────────── Biggest Issue Detection ────────────────────────────────────

/**
 * Determine the single biggest negative-sentiment topic.
 * If that topic shows a time pattern in the hourly issues, mention the peak hour.
 */
function determineBiggestIssue(
  topicSummary: TopicSummary[],
  hourlyIssues: HourlyIssue[],
): string {
  // Find the topic with the most negatives
  const negativeTopics = topicSummary
    .filter(ts => ts.negative > 0)
    .sort((a, b) => b.negative - a.negative);

  if (negativeTopics.length === 0) {
    return 'No major issues detected. Keep it up! 🎉';
  }

  const worstTopic = negativeTopics[0];

  // Check if there is a peak hour for this topic
  const relevantHours = hourlyIssues
    .filter(h => h.topic === worstTopic.topic)
    .sort((a, b) => b.count - a.count);

  if (relevantHours.length > 0) {
    const peakHour = relevantHours[0].hour;
    // Friendly topic labels for the headline
    const topicLabel = worstTopic.topic === 'Delivery Time'
      ? 'Delivery delays'
      : worstTopic.topic === 'Food Quality'
        ? 'Food quality complaints'
        : worstTopic.topic === 'Packaging'
          ? 'Packaging issues'
          : worstTopic.topic === 'Portion Size'
            ? 'Portion size complaints'
            : worstTopic.topic === 'Service'
              ? 'Service complaints'
              : worstTopic.topic === 'Value for Money'
                ? 'Value-for-money complaints'
                : 'General complaints';

    return `Today's biggest issue: ${topicLabel} after ${peakHour}.`;
  }

  return `Today's biggest issue: ${worstTopic.topic}. Check recent negative reviews to address this.`;
}

// ──────────────── Demo Data Generator ────────────────────────────────────────

/**
 * Generate ~15 realistic synthetic reviews with a diverse mix of sentiments,
 * topics, and multi-aspect entries.  Used when real feedback data is sparse
 * (< 5 reviews) so the dashboard always shows meaningful content.
 *
 * @returns  Array of ProcessedReview entries ready for the dashboard.
 */
export function generateDemoReviews(): ProcessedReview[] {
  /**
   * Each demo entry can produce ONE or MORE ProcessedReviews (multi-aspect).
   * We run the real `analyzeReviewText` on each to prove the engine works.
   */
  const demoFeedback: {
    orderId: string;
    itemName: string;
    text: string;
  }[] = [
    // ── Multi-aspect reviews ────────────────────────────────────────────
    {
      orderId: 'DEMO-001',
      itemName: 'Margherita Pizza',
      text: 'Pizza was delicious but delivery was super late',
    },
    {
      orderId: 'DEMO-002',
      itemName: 'Chicken Burger',
      text: 'Burger tasted amazing however the packaging was crushed and messy',
    },
    {
      orderId: 'DEMO-003',
      itemName: 'Paneer Wrap',
      text: 'Good portion size and the wrap was fresh but a bit overpriced',
    },
    {
      orderId: 'DEMO-004',
      itemName: 'French Fries',
      text: 'Fries were soggy and cold although delivery was quick',
    },
    {
      orderId: 'DEMO-005',
      itemName: 'Veg Biryani',
      text: 'Excellent taste but the quantity was tiny for the price',
    },

    // ── Single-aspect reviews ───────────────────────────────────────────
    {
      orderId: 'DEMO-006',
      itemName: 'Chocolate Shake',
      text: 'Absolutely perfect, best shake in town!',
    },
    {
      orderId: 'DEMO-007',
      itemName: 'Garlic Bread',
      text: 'Bread was stale and burnt',
    },
    {
      orderId: 'DEMO-008',
      itemName: 'Pepperoni Pizza',
      text: 'Delivery took forever, waited over 40 minutes',
    },
    {
      orderId: 'DEMO-009',
      itemName: 'Pasta Alfredo',
      text: 'The staff was very polite and helpful',
    },
    {
      orderId: 'DEMO-010',
      itemName: 'Cold Coffee',
      text: 'Not worth the price at all, way too expensive',
    },
    {
      orderId: 'DEMO-011',
      itemName: 'Chicken Wings',
      text: 'Packaging was neat and sealed, food arrived hot',
    },
    {
      orderId: 'DEMO-012',
      itemName: 'Cheese Burst Pizza',
      text: 'Cheesy and flavorful, exactly what I wanted',
    },

    // ── Negation examples ───────────────────────────────────────────────
    {
      orderId: 'DEMO-013',
      itemName: 'Veggie Sub',
      text: 'Not bad at all, the sub was filling',
    },
    {
      orderId: 'DEMO-014',
      itemName: 'Fish Tacos',
      text: 'Service was not helpful and the food was bland',
    },

    // ── Neutral / vague ─────────────────────────────────────────────────
    {
      orderId: 'DEMO-015',
      itemName: 'Water Bottle',
      text: 'It was okay I guess',
    },
  ];

  const reviews: ProcessedReview[] = [];

  for (const entry of demoFeedback) {
    const aspects = analyzeReviewText(entry.text);
    for (const aspect of aspects) {
      reviews.push({
        orderId: entry.orderId,
        itemName: entry.itemName,
        originalText: entry.text,
        topic: aspect.topic,
        status: aspect.status,
      });
    }
  }

  return reviews;
}

/**
 * Convenience function that returns a complete demo `ReviewInsights` object.
 * Useful for dashboard previews, onboarding screens, and testing.
 */
export function getDemoInsights(): ReviewInsights {
  const reviews = generateDemoReviews();
  const topicSummary = buildTopicSummary(reviews);
  const hourlyIssues = buildDemoHourlyIssues();
  const biggestIssue = determineBiggestIssue(topicSummary, hourlyIssues);

  return {
    biggestIssue,
    processedReviews: reviews.slice().reverse(),
    topicSummary,
    hourlyIssues,
    isUsingDemoData: true,
  };
}
