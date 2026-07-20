import { useRef } from 'react';
import { cardHoverIn, cardHoverOut } from '../../utils/gsapUtils';
import { STORAGE_URL } from '../../utils/storageUrl';
import { getLivingStatus } from '../../utils/livingStatus';
import { getMemberInitials } from '../../utils/initials';

export default function MemberCard({ member, onClick, compact, enterDelay, isSelected }) {
  const cardRef = useRef(null);

  const initials = getMemberInitials(member);

  const genderClass = member?.gender?.toLowerCase() || 'other';
  const status = getLivingStatus(member);
  const isDeceased = status === 'deceased';

  // ponytail: forward the React event so callers can measure the card
  // for overlay-anchored UI (the ActionPill in FamilyTree).
  const handleClick = (e) => onClick?.(e, member);

  return (
    <div
      ref={cardRef}
      className={`member-card ${genderClass}${compact ? ' compact' : ''}${isDeceased ? ' deceased' : ''}${isSelected ? ' selected' : ''} card-enter`}
      style={{ '--enter-delay': enterDelay ?? '0ms' }}
      onClick={handleClick}
      onMouseEnter={() => cardHoverIn(cardRef.current)}
      onMouseLeave={() => cardHoverOut(cardRef.current)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(e, member)}
    >
      <div className={`member-avatar${isDeceased ? ' is-deceased' : ''}`}>
        {member?.photo
          ? <img src={`${STORAGE_URL}/${member.photo}`} alt={member.name} />
          : <span>{initials}</span>
        }
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
