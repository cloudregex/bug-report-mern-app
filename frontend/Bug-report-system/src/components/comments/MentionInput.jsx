import { useState, useRef, useEffect } from 'react';
import Avatar from '../ui/Avatar';

/**
 * Textarea with @mention autocomplete.
 * Inserts @username tokens matching backend parseMentions regex.
 */
export default function MentionInput({
  value,
  onChange,
  mentionUsers = [],
  placeholder = 'Write a comment... Use @ to mention someone',
  rows = 3,
  disabled = false,
  className = '',
}) {
  const textareaRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  const getMentionContext = (text, cursorPos) => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@(\w*)$/);
    if (!match) return null;
    return { query: match[1], start: cursorPos - match[0].length };
  };

  const filterUsers = (query) => {
    const q = query.toLowerCase();
    return mentionUsers.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    ).slice(0, 6);
  };

  const handleChange = (e) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(text);

    const ctx = getMentionContext(text, cursor);
    if (ctx) {
      const filtered = filterUsers(ctx.query);
      setMentionQuery(ctx.query);
      setMentionStart(ctx.start);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart < 0) return;

    const before = value.slice(0, mentionStart);
    const after = value.slice(textarea.selectionStart);
    const mention = `@${user.username} `;
    const newValue = before + mention + after;
    onChange(newValue);
    setShowSuggestions(false);

    requestAnimationFrame(() => {
      const pos = before.length + mention.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    setShowSuggestions(false);
  }, [disabled]);

  return (
    <div className="mention-input-wrap">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`field-input field-textarea text-sm ${className}`}
      />

      {showSuggestions && (
        <div className="mention-suggestions animate-fade-in">
          {suggestions.map((user, i) => (
            <button
              key={user._id}
              type="button"
              className={`mention-suggestion ${i === selectedIndex ? 'selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(user)}
            >
              <Avatar name={user.name} size="sm" />
              <div className="mention-suggestion-info">
                <span className="mention-suggestion-name">{user.name}</span>
                <span className="mention-suggestion-username">@{user.username}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function renderCommentWithMentions(content) {
  if (!content) return null;
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="mention-highlight">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
