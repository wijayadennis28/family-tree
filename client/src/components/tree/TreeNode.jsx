import { useRef } from 'react';
import { cardHoverIn, cardHoverOut } from '../../utils/gsapUtils';

export default function MemberCard({ member, onClick, compact }) {
  const cardRef = useRef(null);

  const initials = member?.name
    ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const genderClass = member?.gender?.toLowerCase() || 'other';
  const isDeceased = !member?.is_living;

  return (
    <div
      ref={cardRef}
      className={`member-card ${genderClass}${compact ? ' compact' : ''}`}
      onClick={onClick}
      onMouseEnter={() => cardHoverIn(cardRef.current)}
      onMouseLeave={() => cardHoverOut(cardRef.current)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className={`member-avatar${isDeceased ? ' is-deceased' : ''}`}>
        {member?.photo
          ? <img src={member.photo} alt={member.name} />
          : <span>{initials}</span>
        }
        <div className={`living-dot${isDeceased ? ' deceased' : ''}`} />
      </div>

      <div className="member-name">{member?.name}</div>

      {member?.chinese_name && (
        <div className="member-chinese">{member.chinese_name}</div>
      )}

      <div className="member-years">
        {member?.dob || '?'}
        {isDeceased && member?.dod ? ` – ${member.dod}` : ''}
      </div>
    </div>
  );
}
