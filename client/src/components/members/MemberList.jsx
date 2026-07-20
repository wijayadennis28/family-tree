import { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, Plus, IdentificationCard, CaretDown, House } from '@phosphor-icons/react';
import { animateMemberCards } from '../../utils/gsapUtils';
import { useApi } from '../../hooks/useApi';
import { STORAGE_URL } from '../../utils/storageUrl';
import { getLivingStatus } from '../../utils/livingStatus';
import { getMemberInitials } from '../../utils/initials';
import { buildMemberUrl } from '../../utils/treeUrl';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function MemberList() {
  const { hasAbility, activeFamily, setActiveFamily, familyRoles } = useContext(AuthContext);
  const { t } = useLanguage();
  const api      = useApi();
  const gridRef  = useRef(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [error,   setError]   = useState(null);

  // Page-level fade-in is now handled by the global PageTransition wrapper.

  const familyOptions = useMemo(() => [
    { id: '', name: t('people.allFamilies') },
    ...familyRoles.map(r => ({ id: String(r.familyId), name: r.familyName })),
  ], [familyRoles, t]);

  const handleFamilyChange = (e) => {
    const selectedId = e.target.value;
    const selected = familyOptions.find(f => String(f.id) === selectedId);
    if (selected) {
      setActiveFamily(selected.id ? { id: selected.id, name: selected.name } : null);
    }
  };

  useEffect(() => {
    if (!loading && members.length > 0) {
      animateMemberCards(gridRef.current);
    }
  }, [members]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter === 'living')   params.set('living', 'true');
      if (filter === 'deceased') params.set('living', 'false');
      params.set('family_id', activeFamily?.id ?? '');
      const [data, err] = await api.get(`/members?${params}`);
      if (err) setError(typeof err === 'string' ? err : 'Could not load people.');
      else setMembers(data);
      setLoading(false);
    };
    const timer = setTimeout(load, 300); // debounce search
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, activeFamily]);

  return (
    <div className="p-8 pb-10 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('people.title')}</h1>
        <p className="text-sm text-ft-text-3 mt-1">
          {loading ? t('common.loading') : `${members.length} ${t('people.memberCountLabel')} in the atlas`}
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text" placeholder={t('people.searchPlaceholder')} value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-sm outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 focus:bg-white bg-white text-ft-text-1 placeholder:text-ft-text-3"
        />
        <div className="relative">
          <House className="absolute left-3 top-1/2 -translate-y-1/2 text-ft-text-3 pointer-events-none" size={16} />
          <select
            id="family-filter"
            value={activeFamily?.id ?? ''}
            onChange={handleFamilyChange}
            className="appearance-none w-full sm:w-56 pl-9 pr-10 py-2.5 rounded-lg border-[1.5px] border-slate-200 bg-ft-surface text-ft-text-2 text-xs font-semibold outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 focus:bg-white cursor-pointer"
          >
            {familyOptions.map(family => (
              <option key={family.id || 'all'} value={family.id}>{family.name}</option>
            ))}
          </select>
          <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ft-text-3 pointer-events-none" size={16} />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: t('common.all') },
            { key: 'living', label: t('stats.living') },
            { key: 'deceased', label: t('stats.deceased') },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-2.5 rounded-lg border-[1.5px] font-semibold text-xs cursor-pointer transition-all duration-200 active:scale-[0.97] ${
                filter === key
                  ? 'bg-ft-accent text-white border-ft-accent shadow-ft-sm'
                  : 'bg-ft-surface text-ft-text-2 border-slate-200 hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {hasAbility('add_member', activeFamily?.id) && (
          <Link to="/people/new" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-ft-accent text-white no-underline font-bold text-sm hover:bg-ft-accent-hover active:scale-[0.98] transition-all duration-150 shadow-ft-sm btn-shimmer shrink-0">
            <Plus /> {t('people.addMember')}
          </Link>
        )}
      </div>

      {/* Error */}
      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-5">{error}</div>}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-40 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <div className="h-8 bg-slate-200 rounded flex-1" />
                <div className="h-8 bg-slate-200 rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-ft-accent-light text-ft-accent flex items-center justify-center text-2xl mb-4">
            <Users />
          </div>
          <h2 className="text-xl font-bold text-ft-text-1 mb-1">{t('people.noMembers')}</h2>
          <p className="text-sm text-ft-text-3 mb-6 max-w-md">
            {search
              ? t('people.noSearchResults', `No results for "${search}".`)
              : activeFamily
                ? t('people.emptyFamilyHint', `${activeFamily.name} doesn't have any members yet.`)
                : t('people.selectFamilyHint')}
          </p>
          {hasAbility('add_member', activeFamily?.id) && (
            <Link
              to="/people/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ft-accent text-white font-bold text-sm hover:bg-ft-accent-hover transition-colors"
            >
              <Plus /> {t('people.addMember')}
            </Link>
          )}
        </div>
      )}

      {/* People grid */}
      {!loading && members.length > 0 && (
        <div ref={gridRef} className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {members.map(m => {
            const status = getLivingStatus(m);
            const initials = getMemberInitials(m);
            return (
              <div key={m.id}
                className="group bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 h-full transition-all duration-200 hover:shadow-ft-md hover:-translate-y-0.5 hover:border-ft-accent/30"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-base font-bold border-2 ${
                    status === 'deceased'
                      ? 'bg-slate-100 text-ft-text-3 border-slate-200'
                      : 'bg-ft-accent-light text-ft-accent border-ft-accent/20'
                  }`}>
                    {m.photo ? <img src={`${STORAGE_URL}/${m.photo}`} alt={m.name} className="w-full h-full rounded-full object-cover" /> : initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-ft-text-1 truncate">{m.name}</div>
                    {m.chinese_name && <div className="text-xs text-ft-text-2 truncate">{m.chinese_name}</div>}
                  </div>
                  {status !== 'unknown' && (
                    <span className={`ml-auto text-[0.7rem] py-0.5 px-2 rounded-full font-semibold shrink-0 ${
                      status === 'deceased' ? 'bg-slate-100 text-ft-text-3' : 'bg-green-50 text-green-700'
                    }`}>
                      {status === 'deceased' ? t('stats.deceased') : t('stats.living')}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="text-xs text-ft-text-2 flex flex-col gap-0.5">
                  <span>{m.gender} {m.dob ? `· b. ${m.dob.slice(0,4)}` : ''} {m.dod ? `· d. ${m.dod.slice(0,4)}` : ''}</span>
                  {m.place_of_birth && <span className="flex items-center gap-1"><MapPin /> {m.place_of_birth}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                  <Link to={buildMemberUrl(m)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-ft-accent text-white no-underline font-semibold text-xs hover:bg-ft-accent-hover active:scale-[0.97] transition-all duration-150">
                    <IdentificationCard /> {t('common.profile')}
                  </Link>
                  {hasAbility('edit_member', activeFamily?.id) && (
                    <Link to={`${buildMemberUrl(m)}/edit`} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-slate-200 text-ft-text-2 no-underline font-semibold text-xs hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent active:scale-[0.97] transition-all duration-150">
                      {t('common.edit')}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
