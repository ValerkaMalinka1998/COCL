/* ============================================================
   ЯДРО: константы и состояние
   STORAGE_KEYS, DEFAULT_WORKSHOPS, clState, график смен по умолчанию.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   КОНСТАНТЫ И ХРАНИЛИЩЕ
   ============================================================ */
const STORAGE_KEYS = {
  standards: 'cl_standards_v3',
  history: 'cl_history_v2',
  nodes: 'cl_nodes_v2',
  lines: 'cl_lines_v2',
  shifts: 'cl_shifts_v2',
  brands: 'cl_brands_v2',
  brandWorkshops: 'cl_brandWorkshops_v1',
  lineBrands: 'cl_lineBrands_v2',
  operators: 'cl_operators_v2',
  workshops: 'cl_workshops_v1',   // ← НОВОЕ (заменяет blocks)
  blocks: 'cl_blocks_v1',         // оставлен для удаления при миграции
  lineMachines: 'cl_lineMachines_v1',
  topLosses: 'cl_toplosses_v1',
  electronicShiftCfg: 'cl_electronic_shiftcfg_v1',
  electronicParams: 'cl_electronic_params_v1',
  electronicBrandSchedule: 'cl_electronic_brandschedule_v1',
  customTriggers: 'cl_custom_triggers_v1',
  scheduleWeeks: 'cl_schedule_weeks_v1',
  changeLog: 'cl_change_log_v1'          // лист истории изменений стандартов
};

/* ============================================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ РЕДАКТОРА
   ============================================================ */

let currentEditorLine = null;
let dashboardWorkshop = '';   // '' = все цеха, иначе id цеха

/* ============================================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ============================================================ */
const DEFAULT_LINES = ['SD01','SD03','SD06','SD08','SD12','SD25','SD27','SD31'];
const DEFAULT_SHIFTS = ['A','B','C','D'];
const DEFAULT_BRANDS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

/* ============================================================
   СТРУКТУРА ПРОИЗВОДСТВА
   Цех (workshop) → Участок (area) → Блок (block, опционально) → Линия
   ============================================================ */

const DEFAULT_WORKSHOPS = [
  {
    id: 'smd',
    name: 'SMD',
    subtitle: 'Производство сигарет/стиков',
    areas: [
      {
        id: 'smd_area1',
        name: 'Cell 1',
        blocks: [
          { id: 'smd_area1_lst1', name: 'LST 1', lines: [] },
          { id: 'smd_area1_lst2', name: 'LST 2', lines: [] }
        ]
      },
      {
        id: 'smd_area2',
        name: 'Cell 2',
        blocks: [
          { id: 'smd_area2_lst1', name: 'LST 1', lines: ['SD06', 'SD12', 'SD27', 'SD31'] },
          { id: 'smd_area2_lst2', name: 'LST 2', lines: ['SD01', 'SD03', 'SD08', 'SD25'] }
        ]
      },
      {
        id: 'smd_area3',
        name: 'Cell 3',
        blocks: [
          { id: 'smd_area3_lst1', name: 'LST 1', lines: [] },
          { id: 'smd_area3_lst2', name: 'LST 2', lines: [] }
        ]
      }
    ]
  },
  {
    id: 'pmd',
    name: 'PMD',
    subtitle: 'Производство табака',
    areas: [
      {
        id: 'pmd_sfg',
        name: 'SFG',
        blocks: null,
        lines: ['CLD', 'CRS (жилка)', 'Fibex', 'Бракобойка']
      },
      {
        id: 'pmd_crt',
        name: 'CRT',
        blocks: null,
        lines: ['Lamina', 'Восточный склад', 'Северный склад']
      }
    ]
  },
  {
    id: 'fmd',
    name: 'FMD',
    subtitle: 'Производство фильтров',
    areas: [
      {
        id: 'fmd_cell1',
        name: 'Cell 1',
        blocks: [
          { id: 'fmd_cell1_lst1', name: 'LST 1', lines: [] },
          { id: 'fmd_cell1_lst2', name: 'LST 2', lines: [] }
        ]
      },
      {
        id: 'fmd_cell2',
        name: 'Cell 2',
        blocks: [
          { id: 'fmd_cell2_lst1', name: 'LST 1', lines: [] },
          { id: 'fmd_cell2_lst2', name: 'LST 2', lines: [] }
        ]
      }
    ]
  }
];
/* ============================================================
   ПРОВЕРКА CL — состояние вкладки
   ============================================================ */

const clState = {
  line: null,
  mode: 'mech',
  part: '',
  checkMode: false,
  rows: [],
  todayISO: '',
  weekOffset: 0,
  shiftType: 'day',
  shiftLetter: '—',
  brand: '',
  brandPlanned: '',
  brandReason: '',
  quickDraft: {}
};

/* ============================================================
   CL ELECTRONIC — дефолтная конфигурация графика смен
   ============================================================ */
const DEFAULT_ELECTRONIC_SHIFT_CFG = {
  dayCycle:   ['B','D','D','A','A','C','C','B','B','D','D','A','A','C','C','B'],
  nightCycle: ['A','C','C','B','B','D','D','A','A','C','C','B','B','D','D','A'],
  startDate:  '2026-10-01'
};
