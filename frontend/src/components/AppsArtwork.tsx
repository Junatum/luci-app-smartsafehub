import { useState } from 'preact/hooks';
import { AppsCategoryIcon, appsCategoryOf } from './AppsCategoryIcon';
import type { VerifiedApp } from '../types/apps';
import { safeAppIconUrl } from '../utils/appsDeveloper';

/** An icon never affects verification, installation or launch paths. */
export function AppsArtwork({ app }: { app: VerifiedApp }) {
  const [failed, setFailed] = useState(false);
  const url = safeAppIconUrl(app.iconImageUrl);
  return <span class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-600">
    {url && !failed
      ? <img alt="" class="size-12 rounded-lg object-contain" decoding="async" loading="lazy" referrerPolicy="no-referrer" src={url}
          onError={() => setFailed(true)} />
      : <AppsCategoryIcon category={appsCategoryOf(app.category)} class="size-7" />}
  </span>;
}
