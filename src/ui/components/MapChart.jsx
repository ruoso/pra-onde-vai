// Everything played on the map, as a chart: a section for each home, each
// chord with its function, and the same as a cifra.md chart to copy into
// Estante de Cifras or anywhere else.

import { useState } from 'react';
import { Button, Dialog, DialogTrigger, Heading, Input, Label, Modal, ModalOverlay, TextField } from 'react-aria-components';
import { t } from '../../i18n/index.js';
import { sectionsOf, chartText } from '../mapChart.js';
import { fnName, keyName } from '../words.js';

const BARS_PER_LINE = 4;

export default function MapChart({ map }) {
  const [title, setTitle] = useState('');
  const [copied, setCopied] = useState(null);
  const sections = sectionsOf(map);
  const text = chartText(map, { title: title || t('map.chartUntitled'), keyName, fnName, functionsLabel: t('map.functions') });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <DialogTrigger onOpenChange={() => setCopied(null)}>
      <Button className="button" isDisabled={!sections.length}>{t('map.seeAll')}</Button>
      <ModalOverlay className="overlay" isDismissable>
        <Modal className="modal wide">
          <Dialog className="dialog chart-dialog">
            {({ close }) => (
              <>
                <div className="chart-head">
                  <Heading slot="title" className="card-title">{t('map.chartTitle')}</Heading>
                  <Button className="button small" onPress={close}>{t('map.close')}</Button>
                </div>
                <TextField className="chart-name" value={title} onChange={setTitle}>
                  <Label className="setting-label">{t('map.chartName')}</Label>
                  <Input placeholder={t('map.chartUntitled')} />
                </TextField>
                <div className="chart-view">
                  {sections.map((s, k) => (
                    <section key={k} aria-label={keyName(s.key)}>
                      <h3 className="chart-section">{keyName(s.key)}</h3>
                      <ol className="chart-bars">
                        {s.chords.map((c, i) => (
                          <li key={c.id} className={i % BARS_PER_LINE === 0 ? 'line-start' : ''}>
                            <span className="sym">{c.sym}</span>
                            <span className="fn">{fnName(c.fn)}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
                <div className="row">
                  <Button className="button primary" onPress={copy}>{t('map.copy')}</Button>
                  <span role="status" className="copy-status">
                    {copied === 'ok' ? t('map.copied') : copied === 'failed' ? t('map.copyFailed') : ''}
                  </span>
                </div>
                <details className="chart-source">
                  <summary>{t('map.chartSource')}</summary>
                  <textarea readOnly value={text} aria-label={t('map.chartSource')} rows={Math.min(24, text.split('\n').length)} />
                </details>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
