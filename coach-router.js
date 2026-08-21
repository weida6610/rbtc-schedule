// ============================================================
// RBTC 教練分流模組
// ============================================================

const RBTC_COACH_ROUTER = (() => {
  const DEFAULT_COACH = 'Victor';

  const coaches = {
    Victor: {
      color: '#039BE5',
      label: 'Victor 教練',
      slug: 'victor',
      aliases: ['victor', 'Victor'],
      maxClassesPerDay: 8,
      line: {
        id: 'weida6610',
        url: 'https://line.me/ti/p/XyTQgs3Zlx'
      }
    },
    Apo: {
      color: '#F6BF26',
      label: 'Apo 教練',
      slug: 'apo',
      aliases: ['apo', 'Apo'],
      line: {
        id: 'clotwuedc',
        url: 'https://line.me/ti/p/pZMY-dhWCc'
      }
    },
    Morgan: {
      color: '#8E24AA',
      label: 'Morgan 教練',
      slug: 'morgan',
      aliases: ['morgan', 'Morgan'],
      line: {
        id: 'Morgan4992',
        url: 'https://line.me/ti/p/lHZkfGbluR'
      }
    },
    Adam: {
      color: '#D50000',
      label: 'Adam 教練',
      slug: 'adam',
      aliases: ['adam', 'Adam'],
      line: {
        id: '',
        url: 'https://line.me/ti/p/udNvHhN2LJ'
      }
    },
    Rick: {
      color: '#616161',
      label: 'Rick 教練',
      slug: 'rick',
      aliases: ['rick', 'Rick'],
      line: {
        id: '86181225',
        url: 'https://line.me/ti/p/NqkRWrrDDV'
      }
    },
    Verna: {
      color: '#E67C73',
      label: 'Verna 教練',
      slug: 'verna',
      aliases: ['verna', 'Verna'],
      line: {
        id: 'jenny5130991',
        url: 'https://line.me/ti/p/vsTvksHLq0'
      }
    }
  };

  const coachOrder = ['Victor', 'Apo', 'Morgan', 'Adam', 'Rick', 'Verna'];

  const aliasMap = coachOrder.reduce((map, coachName) => {
    const config = coaches[coachName];
    [coachName, config.slug, ...config.aliases].forEach(alias => {
      map.set(normalizeToken(alias), coachName);
    });
    return map;
  }, new Map());

  function normalizeToken(value) {
    return decodeURIComponent(String(value || ''))
      .trim()
      .replace(/^@/, '')
      .toLowerCase();
  }

  function resolveToken(value) {
    return aliasMap.get(normalizeToken(value)) || null;
  }

  function pathCoachToken(pathname) {
    const segments = String(pathname || '')
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean);

    const ignored = new Set(['rbtc-schedule', 'coach']);
    return segments.find(segment => !ignored.has(segment.toLowerCase())) || '';
  }

  function resolveFromLocation(location) {
    const params = new URLSearchParams(location.search || '');
    const queryToken = params.get('coach') || params.get('c');
    const pathToken = pathCoachToken(location.pathname);
    const hashToken = String(location.hash || '').replace(/^#/, '');
    const token = queryToken || pathToken || hashToken || DEFAULT_COACH;
    const coach = resolveToken(token);

    return {
      coach: coach || DEFAULT_COACH,
      invalidToken: coach ? '' : token,
      source: queryToken ? 'query' : pathToken ? 'path' : hashToken ? 'hash' : 'default'
    };
  }

  function queryUrl(coachName) {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, '/') || '/';
    url.search = '';
    url.hash = '';
    url.searchParams.set('coach', coachName);
    return `${url.pathname}${url.search}`;
  }

  function canonicalUrl(coachName) {
    return `https://schedule.rbtctw.com/?coach=${encodeURIComponent(coachName)}`;
  }

  return {
    coaches,
    coachOrder,
    defaultCoach: DEFAULT_COACH,
    canonicalUrl,
    queryUrl,
    resolveFromLocation,
    resolveToken
  };
})();
