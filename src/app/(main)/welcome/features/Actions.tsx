'use client';

import { Icon } from '@lobehub/ui';
import { Button } from 'antd';
import { SendHorizonal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

const Actions = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('welcome');
  const router = useRouter();

  return (
    <Flexbox gap={16} horizontal={!mobile} justify={'center'} width={'100%'} wrap={'wrap'}>
      <Button
        block={mobile}
        onClick={() => router.push('/chat')}
        size={'large'}
        style={{ minWidth: 160 }}
        type={'primary'}
      >
        <Flexbox align={'center'} gap={4} horizontal justify={'center'}>
          {t('button.start')}
          <Icon icon={SendHorizonal} />
        </Flexbox>
      </Button>
    </Flexbox>
  );
});

export default Actions;
