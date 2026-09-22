import { memo, useEffect } from 'react';

const PageTitle = memo<{ title: string }>(({ title }) => {
  useEffect(() => {
    document.title = title ? `${title} · Family-OS` : 'Family-OS';
  }, [title]);

  return null;
});

export default PageTitle;
