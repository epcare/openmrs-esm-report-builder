import React from 'react';
import { Tag } from '@carbon/react';

const IndicatorStatusTag: React.FC<{ status: 'Draft' | 'Published' }> = ({ status }) => {
    if (status === 'Published') return <Tag type="green">Published</Tag>;
    return <Tag type="cool-gray">Draft</Tag>;
};

export default IndicatorStatusTag;