import type { BuiltinFont } from '../../types/sign'
import { withBase } from '../../lib/base-path'

export const builtinFonts: BuiltinFont[] = [
  {
    id: 'altone-trial-regular',
    label: 'Altone Trial Regular',
    file: withBase('/fonts/altone-trial-regular.ttf'),
  },
  {
    id: 'altone-trial-bold',
    label: 'Altone Trial Bold',
    file: withBase('/fonts/altone-trial-bold.ttf'),
  },
  {
    id: 'altone-trial-oblique',
    label: 'Altone Trial Oblique',
    file: withBase('/fonts/altone-trial-oblique.ttf'),
  },
  {
    id: 'altone-trial-bold-oblique',
    label: 'Altone Trial Bold Oblique',
    file: withBase('/fonts/altone-trial-bold-oblique.ttf'),
  },
  {
    id: 'bookman-opti-bold',
    label: 'Bookman Opti Bold',
    file: withBase('/fonts/bookman-opti-bold.otf'),
  },
  {
    id: 'bookman-opti-light',
    label: 'Bookman Opti Light',
    file: withBase('/fonts/bookman-opti-light.otf'),
  },
  {
    id: 'fira-sans-condensed-bold',
    label: 'Fira Sans Condensed Bold',
    file: withBase('/fonts/fira-sans-condensed-bold.otf'),
  },
  {
    id: 'ubuntu-sans-variable',
    label: 'Ubuntu Sans Variable',
    file: withBase('/fonts/ubuntu-sans-variable.ttf'),
  },
  {
    id: 'open-sans-light',
    label: 'Open Sans Light',
    file: withBase('/fonts/open-sans-light.ttf'),
  },
  {
    id: 'open-sans-cond-light',
    label: 'Open Sans Condensed Light',
    file: withBase('/fonts/open-sans-cond-light.ttf'),
  },
  {
    id: 'dejavu-serif-bold',
    label: 'DejaVu Serif Bold',
    file: withBase('/fonts/dejavu-serif-bold.ttf'),
  },
  {
    id: 'dejavu-sans-mono',
    label: 'DejaVu Sans Mono',
    file: withBase('/fonts/dejavu-sans-mono.ttf'),
  },
]
