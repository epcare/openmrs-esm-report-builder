/**
 * Report Layer Component
 *
 * Displays the HTML rendered report with theme-aware styling.
 * Ensures headers, tables, and other elements match the SPA's theme.
 * Strips inline <style> tags from backend HTML to prevent style conflicts.
 */
import React, { useMemo } from 'react';
import styles from '../../report-visualizer.scss';

interface ReportLayerProps {
  htmlContent: string;
  reportName?: string;
}

const ReportLayer: React.FC<ReportLayerProps> = ({ htmlContent, reportName }) => {
  // Strip inline <style> tags from backend HTML to prevent them from overriding our theme styles
  const sanitizedHtml = useMemo(() => {
    return htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  }, [htmlContent]);

  return (
    <div className={styles.reportLayer}>
      <div
        className={styles.reportLayerContent}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        data-report-name={reportName}
      />
    </div>
  );
};

export default ReportLayer;
