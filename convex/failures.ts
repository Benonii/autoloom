const friendlyMessages: [RegExp, string][] = [
  [/ERR_NAME_NOT_RESOLVED|ENOTFOUND/, 'We could not find that website. Check the link for typos and try again.'],
  [
    /ERR_CONNECTION_REFUSED|ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ECONNREFUSED|ERR_ADDRESS_UNREACHABLE/,
    'That website did not answer. Make sure it is online and try again.'
  ],
  [/ERR_CERT|SSL|certificate/i, 'That website has a security certificate problem, so we could not open it safely.'],
  [
    /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED/,
    'The recorder lost its internet connection. Try again in a moment.'
  ],
  [
    /goto: Timeout|Navigation timeout|ERR_TIMED_OUT/,
    'That website took too long to load. Try again, or try a faster page.'
  ]
];

const technicalPrefix = /^(page|locator|frame|browser|context|elementHandle)\.[a-zA-Z]+:\s*/;

export function toFriendlyFailure(message: string): string {
  const match = friendlyMessages.find(([pattern]) => pattern.test(message));
  if (match) return match[1];
  const cleaned = message
    .replace(technicalPrefix, '')
    .replace(/\s+at https?:\/\/\S+$/, '')
    .trim();
  if (/net::ERR_|Error:|\bat\s+\S+\s+\(/.test(cleaned)) return 'Something went wrong while recording. Try again.';
  return cleaned || 'Something went wrong while recording. Try again.';
}
