import algoliasearch from 'algoliasearch/lite';
import docsStyle from './docs.css';
import DocumentOutline from '@spectrum-icons/workflow/DocumentOutline';
import DOMPurify from 'dompurify';
import {Icon} from '@react-spectrum/icon';
import {Item, SearchAutocomplete, Section} from '@react-spectrum/autocomplete';
import News from '@spectrum-icons/workflow/News';
import React, {useEffect, useRef, useState} from 'react';
import {Text} from '@adobe/react-spectrum';
import {ThemeProvider} from './ThemeSwitcher';

let client = algoliasearch('1V1Q59JVTR', '44a7e2e7508ff185f25ac64c0a675f98');
let searchIndex = client.initIndex('react-spectrum');

const searchOptions = {
  distinct: 1,
  attributesToRetrieve: [
    'hierarchy.lvl0',
    'hierarchy.lvl1',
    'hierarchy.lvl2',
    'hierarchy.lvl3',
    'hierarchy.lvl4',
    'hierarchy.lvl5',
    'hierarchy.lvl6',
    'content',
    'type',
    'url'
  ],
  attributesToSnippet: [
    'hierarchy.lvl1:10',
    'hierarchy.lvl2:10',
    'hierarchy.lvl3:10',
    'hierarchy.lvl4:10',
    'hierarchy.lvl5:10',
    'hierarchy.lvl6:10',
    'content:10'
  ],
  snippetEllipsisText: '…',
  highlightPreTag: `<mark role="presentation" class="${docsStyle.docSearchBoxMark}">`,
  highlightPostTag: '</mark>',
  hitsPerPage: 20
};

const sectionTitles = {
  'react-aria': 'React Aria',
  'react-spectrum': 'React Spectrum',
  'react-stately': 'React Stately',
  'internationalized': 'Internationalized',
  'blog': 'Blog',
  'architecture': 'Architecture',
  'contribute': 'Contribute',
  'releases': 'Releases',
  'support': 'Support'
};

function sectionTitlePredicate(hit) {
  let sectionTitle;
  for (const [path, title] of Object.entries(sectionTitles)) {
    let regexp = new RegExp('^.+//.+/' + path + '[/.].+$', 'i');
    if (hit.url.match(regexp)) {
      sectionTitle = title;
      break;
    }
  }
  if (!sectionTitle) {
    sectionTitle = 'Documentation';
  }
  return sectionTitle;
}

export default function DocSearch() {
  const [searchValue, setSearchValue] = useState('');
  const [loadingState, setLoadingState] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const searchAutocompleteRef = useRef();

  useEffect(() => {
    // Focus search input when user presses Ctrl/Cmd + K
    let handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchAutocompleteRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  let updatePredictions = ({hits}) => {
    setPredictions(hits);

    const groupedBySection = groupBy(hits, (hit) => sectionTitlePredicate(hit));
    let sections = [];
    for (const [title, hits] of Object.entries(groupedBySection)) {
      const items = Object.values(
        groupBy(hits, (hit) => hit.hierarchy.lvl1)
      )
      .reverse()
      .map(
        groupedHits =>
        groupedHits.map((hit) => {
          const hierarchy = hit.hierarchy;
          const objectID = hit.objectID;
          const docsearchParent = hit.type !== 'lvl1' &&
            groupedHits.find(
              (siblingItem) =>
                siblingItem.type === 'lvl1' &&
                siblingItem.hierarchy.lvl1 ===
                  hit.hierarchy.lvl1
            );

          return {
            key: objectID,
            hit,
            hierarchy,
            docsearchParent,
            textValue: hit.type === 'content' ? hit[hit.type] : hierarchy[hit.type]
          };
        }
      ));

      sections.push({title, items: items.map((item) => item[0])});
    }
    let titles = Object.values(sectionTitles);
    sections = sections.sort((a, b) => titles.indexOf(a.title) < titles.indexOf(b.title) ? -1 : 1);
    let newSuggestions = sections.map((section, index) => ({key: `${index}-${section.title}`, title: section.title, children: section.items}));
    newSuggestions.push({
      key: 'algolia-footer',
      title: 'Search by',
      children: [
        {
          key: 'algolia-footer-logo',
          textValue: 'Algolia'
        }
      ]
    });
    setSuggestions(newSuggestions);
    setLoadingState(null);
  };

  let onInputChange = (query) => {
    setSearchValue(query);
    if (!query && predictions) {
      setPredictions(null);
      setSuggestions([]);
      setLoadingState(null);
      return;
    }
    setLoadingState('filtering');
    searchIndex
      .search(
        query,
        searchOptions
      )
      .then(updatePredictions);
  };

  let onSubmit = (value, key) => {
    if (key === 'algolia-footer-logo') {
      window.open('https://www.algolia.com/ref/docsearch/?utm_source=react-spectrum.adobe.com&amp;utm_medium=referral&amp;utm_content=powered_by&amp;utm_campaign=docsearch', '_blank');
    } else if (key) {
      let prediction = predictions.find(prediction => key === prediction.objectID);
      let url = prediction.url;
      window.location.href = `${window.location.hostname === 'reactspectrum.blob.core.windows.net' ? window.location.href.replace(/(.+\/docs\/)(.+)/, '$1') : '/'}${url.replace('https://react-spectrum.adobe.com/', '')}`;
    }
  };

  return (
    <ThemeProvider UNSAFE_className={docsStyle.docSearchBoxThemeProvider}>
      <span role="search">
        <SearchAutocomplete
          ref={searchAutocompleteRef}
          aria-label="Search"
          UNSAFE_className={docsStyle.docSearchBox}
          items={suggestions}
          loadingState={loadingState}
          value={searchValue}
          onInputChange={onInputChange}
          onSubmit={onSubmit}>
          {(section) => (
            <Section key={section.key} items={section.children} title={section.title}>
              {(item) => (
                <Item key={item.key} textValue={item.textValue}>
                  {item.key === 'algolia-footer-logo' && (
                    <Text>
                      <svg width="77" height="19" aria-label="Algolia" role="img" style={{color: 'var(--docsearch-logo-color)'}}>
                        <path d="M2.5067 0h14.0245c1.384.001 2.5058 1.1205 2.5068 2.5017V16.5c-.0014 1.3808-1.1232 2.4995-2.5068 2.5H2.5067C1.1232 18.9995.0014 17.8808 0 16.5V2.4958A2.495 2.495 0 01.735.7294 2.505 2.505 0 012.5068 0zM37.95 15.0695c-3.7068.0168-3.7068-2.986-3.7068-3.4634L34.2372.3576 36.498 0v11.1794c0 .2715 0 1.9889 1.452 1.994v1.8961zm-9.1666-1.8388c.694 0 1.2086-.0397 1.5678-.1088v-2.2934a5.3639 5.3639 0 00-1.3303-.1679 4.8283 4.8283 0 00-.758.0582 2.2845 2.2845 0 00-.688.2024c-.2029.0979-.371.2362-.4919.4142-.1268.1788-.185.2826-.185.5533 0 .5297.185.8359.5205 1.0375.3355.2016.7928.3053 1.365.3053v-.0008zm-.1969-8.1817c.7463 0 1.3768.092 1.8856.2767.5088.1838.9195.4428 1.2204.7717.3068.334.5147.7777.6423 1.251.1327.4723.196.991.196 1.5603v5.798c-.5235.1036-1.05.192-1.5787.2649-.7048.1037-1.4976.156-2.3774.156-.5832 0-1.1215-.0582-1.6016-.167a3.385 3.385 0 01-1.2432-.5364 2.6034 2.6034 0 01-.8037-.9565c-.191-.3922-.29-.9447-.29-1.5208 0-.5533.11-.905.3246-1.2863a2.7351 2.7351 0 01.8849-.9329c.376-.242.8029-.415 1.2948-.5187a7.4517 7.4517 0 011.5381-.156 7.1162 7.1162 0 011.6667.2024V8.886c0-.259-.0296-.5061-.093-.7372a1.5847 1.5847 0 00-.3245-.6158 1.5079 1.5079 0 00-.6119-.4158 2.6788 2.6788 0 00-.966-.173c-.5206 0-.9948.0634-1.4283.1384a6.5481 6.5481 0 00-1.065.259l-.2712-1.849c.2831-.0986.7048-.1964 1.2491-.2943a9.2979 9.2979 0 011.752-.1501v.0008zm44.6597 8.1193c.6947 0 1.2086-.0405 1.567-.1097v-2.2942a5.3743 5.3743 0 00-1.3303-.1679c-.2485 0-.503.0177-.7573.0582a2.2853 2.2853 0 00-.688.2024 1.2333 1.2333 0 00-.4918.4142c-.1268.1788-.1843.2826-.1843.5533 0 .5297.1843.8359.5198 1.0375.3414.2066.7927.3053 1.365.3053v.0009zm-.191-8.1767c.7463 0 1.3768.0912 1.8856.2759.5087.1847.9195.4436 1.2204.7717.3.329.5147.7786.6414 1.251a5.7248 5.7248 0 01.197 1.562v5.7972c-.3466.0742-.874.1602-1.5788.2648-.7049.1038-1.4976.1552-2.3774.1552-.5832 0-1.1215-.0573-1.6016-.167a3.385 3.385 0 01-1.2432-.5356 2.6034 2.6034 0 01-.8038-.9565c-.191-.3922-.2898-.9447-.2898-1.5216 0-.5533.1098-.905.3245-1.2854a2.7373 2.7373 0 01.8849-.9338c.376-.2412.8029-.4141 1.2947-.5178a7.4545 7.4545 0 012.325-.1097c.2781.0287.5672.081.879.156v-.3686a2.7781 2.7781 0 00-.092-.738 1.5788 1.5788 0 00-.3246-.6166 1.5079 1.5079 0 00-.612-.415 2.6797 2.6797 0 00-.966-.1729c-.5205 0-.9947.0633-1.4282.1384a6.5608 6.5608 0 00-1.065.259l-.2712-1.8498c.283-.0979.7048-.1957 1.2491-.2935a9.8597 9.8597 0 011.752-.1494zm-6.79-1.072c-.7576.001-1.373-.6103-1.3759-1.3664 0-.755.6128-1.3664 1.376-1.3664.764 0 1.3775.6115 1.3775 1.3664s-.6195 1.3664-1.3776 1.3664zm1.1393 11.1507h-2.2726V5.3409l2.2734-.3568v10.0845l-.0008.0017zm-3.984 0c-3.707.0168-3.707-2.986-3.707-3.4642L59.7069.3576 61.9685 0v11.1794c0 .2715 0 1.9889 1.452 1.994V15.0703zm-7.3512-4.979c0-.975-.2138-1.7873-.6305-2.3516-.4167-.571-.9998-.852-1.747-.852-.7454 0-1.3302.281-1.7452.852-.4166.5702-.6195 1.3765-.6195 2.3516 0 .9851.208 1.6473.6254 2.2183.4158.576.9998.8587 1.7461.8587.7454 0 1.3303-.2885 1.747-.8595.4158-.5761.6237-1.2315.6237-2.2184v.0009zm2.3132-.006c0 .7609-.1099 1.3361-.3356 1.9654a4.654 4.654 0 01-.9533 1.6076A4.214 4.214 0 0155.613 14.69c-.579.2412-1.4697.3795-1.9143.3795-.4462-.005-1.3303-.1324-1.9033-.3795a4.307 4.307 0 01-1.474-1.0316c-.4115-.4445-.7293-.9801-.9609-1.6076a5.3423 5.3423 0 01-.3465-1.9653c0-.7608.104-1.493.3356-2.1155a4.683 4.683 0 01.9719-1.5958 4.3383 4.3383 0 011.479-1.0257c.5739-.242 1.2043-.3567 1.8864-.3567.6829 0 1.3125.1197 1.8906.3567a4.1245 4.1245 0 011.4816 1.0257 4.7587 4.7587 0 01.9592 1.5958c.2426.6225.3643 1.3547.3643 2.1155zm-17.0198 0c0 .9448.208 1.9932.6238 2.431.4166.4386.955.6579 1.6142.6579.3584 0 .6998-.0523 1.0176-.1502.3186-.0978.5721-.2134.775-.3517V7.0784a8.8706 8.8706 0 00-1.4926-.1906c-.8206-.0236-1.4452.312-1.8847.8468-.4335.5365-.6533 1.476-.6533 2.3516v-.0008zm6.2863 4.4485c0 1.5385-.3938 2.662-1.1866 3.3773-.791.7136-2.0005 1.0712-3.6308 1.0712-.5958 0-1.834-.1156-2.8228-.334l.3643-1.7865c.8282.173 1.9202.2193 2.4932.2193.9077 0 1.555-.1847 1.943-.5533.388-.3686.578-.916.578-1.643v-.3687a6.8289 6.8289 0 01-.8848.3349c-.3634.1096-.786.167-1.261.167-.6246 0-1.1917-.0979-1.7055-.2944a3.5554 3.5554 0 01-1.3244-.8645c-.3642-.3796-.6541-.8579-.8561-1.4289-.2028-.571-.3068-1.59-.3068-2.339 0-.7034.1099-1.5856.3245-2.1735.2198-.5871.5316-1.0949.9542-1.515.4167-.42.9255-.743 1.5213-.98a5.5923 5.5923 0 012.052-.3855c.7353 0 1.4114.092 2.0707.2024.6592.1088 1.2204.2236 1.6776.35v8.945-.0008zM11.5026 4.2418v-.6511c-.0005-.4553-.3704-.8241-.8266-.8241H8.749c-.4561 0-.826.3688-.8265.824v.669c0 .0742.0693.1264.1445.1096a6.0346 6.0346 0 011.6768-.2362 6.125 6.125 0 011.6202.2185.1116.1116 0 00.1386-.1097zm-5.2806.852l-.3296-.3282a.8266.8266 0 00-1.168 0l-.393.3922a.8199.8199 0 000 1.164l.3237.323c.0524.0515.1268.0397.1733-.0117.191-.259.3989-.507.6305-.7372.2374-.2362.48-.4437.7462-.6335.0575-.0354.0634-.1155.017-.1687zm3.5159 2.069v2.818c0 .081.0879.1392.1622.0987l2.5102-1.2964c.0574-.0287.0752-.0987.0464-.1552a3.1237 3.1237 0 00-2.603-1.574c-.0575 0-.115.0456-.115.1097l-.0008-.0009zm.0008 6.789c-2.0933.0005-3.7915-1.6912-3.7947-3.7804C5.9468 8.0821 7.6452 6.39 9.7387 6.391c2.0932-.0005 3.7911 1.6914 3.794 3.7804a3.7783 3.7783 0 01-1.1124 2.675 3.7936 3.7936 0 01-2.6824 1.1054h.0008zM9.738 4.8002c-1.9218 0-3.6975 1.0232-4.6584 2.6841a5.359 5.359 0 000 5.3683c.9609 1.661 2.7366 2.6841 4.6584 2.6841a5.3891 5.3891 0 003.8073-1.5725 5.3675 5.3675 0 001.578-3.7987 5.3574 5.3574 0 00-1.5771-3.797A5.379 5.379 0 009.7387 4.801l-.0008-.0008z" fill="currentColor" fillRule="evenodd" />
                      </svg>
                    </Text>
                  )}
                  {
                    item.hierarchy &&
                    item.hierarchy[item.hit.type] &&
                    item.hit.type === 'lvl1' && (
                      <>
                        {
                          section.title === 'Blog' || section.title === 'Releases' ?
                            <News aria-label="news" /> :
                            <DocumentOutline aria-label="web page" />
                        }
                        <Text>
                          <Snippet
                            className="DocSearch-Hit-title"
                            hit={item.hit}
                            attribute="hierarchy.lvl1" />
                        </Text>
                        {item.hit.content && (
                          <Text slot="description">
                            <Snippet
                              className="DocSearch-Hit-path"
                              hit={item.hit}
                              attribute="content" />
                          </Text>
                        )}
                      </>
                    )
                  }

                  {
                    item.hierarchy && item.hierarchy[item.hit.type] &&
                    (
                      item.hit.type === 'lvl2' ||
                      item.hit.type === 'lvl3' ||
                      item.hit.type === 'lvl4' ||
                      item.hit.type === 'lvl5' ||
                      item.hit.type === 'lvl6'
                    ) && (
                      <>
                        <Hash
                          UNSAFE_className={item.docsearchParent ? docsStyle.docSearchItemIndent : undefined}
                          aria-label="in-page link" />
                        <Text>
                          <Snippet
                            className="DocSearch-Hit-title"
                            hit={item.hit}
                            attribute={`hierarchy.${item.hit.type}`} />
                        </Text>
                        <Text slot="description">
                          <Snippet
                            className="DocSearch-Hit-path"
                            hit={item.hit}
                            attribute="hierarchy.lvl1" />
                        </Text>
                      </>
                    )
                  }

                  {
                    item.hit && item.hit.type === 'content' && (
                      <>
                        <Hash
                          UNSAFE_className={item.docsearchParent ? docsStyle.docSearchItemIndent : undefined}
                          aria-label="in-page link" />
                        <Text>
                          <Snippet
                            className="DocSearch-Hit-title"
                            hit={item.hit}
                            attribute="content" />
                        </Text>
                        <Text slot="description">
                          <Snippet
                            className="DocSearch-Hit-path"
                            hit={item.hit}
                            attribute="hierarchy.lvl1" />
                        </Text>
                      </>
                    )
                  }
                </Item>
              )}
            </Section>
          )}
        </SearchAutocomplete>
      </span>
    </ThemeProvider>
  );
}

function Hash(props) {
  return (
    <Icon {...props}>
      <svg viewBox="0 0 20 20">
        <path d="M13 13h4-4V8H7v5h6v4-4H7V8H3h4V3v5h6V3v5h4-4v5zm-6 0v4-4H3h4z" stroke="currentColor" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Icon>
  );
}

function groupBy(values, predicate = (value) => value) {
  return values.reduce((accumulator, item) => {
    const key = predicate(item);

    if (!Object.prototype.hasOwnProperty.call(accumulator, key)) {
      accumulator[key] = [];
    }

    // We limit each section to show 20 hits maximum.
    // This acts as a frontend alternative to `distinct`.
    if (accumulator[key].length < 21) {
      accumulator[key].push(item);
    }

    return accumulator;
  }, {});
}

function getPropertyByPath(object, path) {
  const parts = path.split('.');

  return parts.reduce((prev, current) => {
    if (prev?.[current]) {
      return prev[current];
    }
    return null;
  }, object);
}

function Snippet({
  hit,
  attribute,
  tagName = 'span',
  ...rest
}) {
  return React.createElement(tagName, {
    ...rest,
    dangerouslySetInnerHTML: {
      __html:
        DOMPurify.sanitize(
          getPropertyByPath(hit, `_snippetResult.${attribute}.value`) ||
          getPropertyByPath(hit, attribute)
        )
    }
  });
}


