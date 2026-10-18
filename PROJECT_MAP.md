# Карта проекта COCL

Сгенерировано 2026-10-18 по коммиту `61a493d TOP Losses: разбор потери + проверка; E-Param в Top Losses; уведомление Machine Journal` скриптом `.claude/skills/cocl-session-close/scripts/gen_project_map.py` — пересоздавайте после крупных правок.

JS — 45 модулей, 18197 строк, 485 функций · CSS — 27 файлов, 11251 строк.
Как искать: модуль по назначению → раздел в таблице ниже → `Grep` по имени функции в этом файле.

## JS-модули (в порядке подключения в index.html)

Все модули — обычные `<script>` с общим пространством имён. Код, выполняемый при загрузке, не может ссылаться на модули, подключённые позже — проверка: `node .claude/skills/cocl-review/scripts/check_load_order.js`.

| Модуль | Строк | Функций | Назначение |
| --- | --- | --- | --- |
| `js/router.js` | 173 | 2 | РОУТЕР — навигация между вкладками с сохранением в URL |
| `js/core/utils.js` | 78 | 13 | ЯДРО: утилиты |
| `js/core/state.js` | 154 | 0 | ЯДРО: константы и состояние |
| `js/core/dates.js` | 135 | 13 | ЯДРО: даты, недели, смены |
| `js/core/modal.js` | 134 | 4 | ЯДРО: стек модальных окон |
| `js/data/standards.js` | 241 | 11 | ДАННЫЕ: стандарты и история |
| `js/data/workshops.js` | 237 | 17 | ДАННЫЕ: структура производства |
| `js/data/catalog.js` | 474 | 40 | ДАННЫЕ: справочники |
| `js/data/schedule.js` | 179 | 10 | ДАННЫЕ: расписание CL |
| `js/components/pickers.js` | 420 | 14 | КОМПОНЕНТЫ: окна выбора |
| `js/components/line-picker.js` | 368 | 14 | КОМПОНЕНТЫ: выбор линии |
| `js/components/standard-view.js` | 314 | 13 | КОМПОНЕНТЫ: окно просмотра стандарта |
| `js/components/quick-add-machine.js` | 81 | 2 | КОМПОНЕНТЫ: быстрое добавление машины к линии |
| `js/components/cil-table.js` | 174 | 10 | КОМПОНЕНТЫ: таблица недели в стиле CIL |
| `js/components/mj-notice.js` | 72 | 2 | КОМПОНЕНТЫ: уведомление «Сделайте запись в Machine Journal» |
| `js/io/excel-common.js` | 52 | 0 | EXCEL: общие функции шаблонов |
| `js/io/standards-io.js` | 822 | 3 | EXCEL: импорт и экспорт стандартов |
| `js/views/brand-schedule.js` | 396 | 7 | ВКЛАДКА CL: расписание брендов |
| `js/views/cocl/cocl.js` | 1019 | 29 | ВКЛАДКА «Проверка COCL» |
| `js/views/cocl/cocl-save.js` | 174 | 1 | ВКЛАДКА «Проверка COCL»: сохранение |
| `js/views/cl-checklist/cl-checklist.js` | 854 | 22 | ВКЛАДКА «Чек-лист CL» |
| `js/views/cl-checklist/quick-check.js` | 435 | 8 | ВКЛАДКА «Чек-лист CL»: быстрая проверка |
| `js/views/cl-checklist/cl-save.js` | 197 | 4 | ВКЛАДКА «Чек-лист CL»: сохранение в историю |
| `js/views/toploss/toploss.js` | 394 | 14 | ВКЛАДКА «TOP Losses»: разбор потерь линии |
| `js/views/toploss/toploss-check.js` | 382 | 8 | TOP LOSSES: проверка, сохранение, итог |
| `js/views/history/history.js` | 463 | 9 | ВКЛАДКА «История» |
| `js/views/history/history-export.js` | 728 | 9 | ИСТОРИЯ: экспорт CSV / XLSX |
| `js/views/dashboard.js` | 1394 | 19 | ВКЛАДКА «Дашборд» |
| `js/views/editor/editor-core.js` | 757 | 16 | ВКЛАДКА «Стандарты CL»: каркас |
| `js/views/editor/editor-mech.js` | 321 | 12 | СТАНДАРТЫ CL: таблица механических стандартов |
| `js/views/editor/editor-elec.js` | 462 | 10 | СТАНДАРТЫ CL: таблица электронных параметров + Excel |
| `js/views/editor/eparam-page.js` | 579 | 10 | СТРАНИЦА электронного параметра |
| `js/views/standard-page/standard-page.js` | 730 | 18 | СТРАНИЦА стандарта: открытие, поля, точки |
| `js/views/standard-page/standard-page-extra.js` | 655 | 7 | СТРАНИЦА стандарта: фото, связи, доп. информация, сохранение |
| `js/views/schedule/schedule.js` | 986 | 30 | ВКЛАДКА «Расписание CL» |
| `js/views/schedule/schedule-add.js` | 438 | 8 | РАСПИСАНИЕ CL: добавление стандартов |
| `js/views/settings/settings-shell.js` | 154 | 9 | НАСТРОЙКИ: каркас вкладки |
| `js/views/settings/structure-tree.js` | 659 | 18 | НАСТРОЙКИ: структура производства — дерево и карточка линии |
| `js/views/settings/shifts.js` | 218 | 8 | НАСТРОЙКИ: график смен |
| `js/views/settings/toplosses.js` | 475 | 9 | НАСТРОЙКИ: Top Losses |
| `js/views/settings/brands.js` | 353 | 7 | НАСТРОЙКИ: общий список брендов |
| `js/views/settings/operators.js` | 208 | 7 | НАСТРОЙКИ: операторы |
| `js/views/settings/triggers.js` | 184 | 6 | НАСТРОЙКИ: триггеры Change Over |
| `js/views/settings/photos.js` | 339 | 7 | НАСТРОЙКИ: хранилище и проверка фото |
| `js/app.js` | 135 | 5 | ЗАПУСК ПРИЛОЖЕНИЯ |

## JS — разделы и функции

| Файл:строка | Раздел | Функции |
| --- | --- | --- |
| js/router.js:1 | (начало модуля) | `switchTab`, `initRouter` |
| js/core/utils.js:8 | УТИЛИТЫ | `$`, `$$`, `showToast`, `nowStr`, `fmtDate`, `uid`, `escapeHtml`, `getPhotoPath`, `escapeAttr` |
| js/core/utils.js:64 | ДОСТУП К ДАННЫМ | `load`, `save`, `getOperators`, `setOperators` |
| js/core/dates.js:1 | (начало модуля) | `todayISO`, `addDaysISO`, `getWeekDays`, `getClWeekDays`, `getWeekLabel`, `fmtISODate`, `daysSinceStart`, `getDayShiftForDate`, `getNightShiftForDate`, `getShiftsForDate`, `getCurrentShiftPeriod`, `getShiftForDate`, `fmtShortDate` |
| js/core/modal.js:8 | СТЕК МОДАЛЬНЫХ ОКОН | `openModal`, `closeModal`, `bindModalBackdropClose`, `pluralizeStandards` |
| js/data/standards.js:8 | ФАБРИКА СТАНДАРТА — единая структура | `createEmptyStandard`, `normalizeAppliesTo`, `normalizeMeasurements`, `parseNorm` |
| js/data/standards.js:160 | ТИПЫ КОНТРОЛЯ — миграция на 3 канонических типа | `hasToleranceInMeasurements`, `migrateControlType`, `normalizeStandard`, `getStandards`, `setStandards`, `getHistory`, `setHistory` |
| js/data/workshops.js:8 | СТРУКТУРА ПРОИЗВОДСТВА — доступ к данным | `migrateToWorkshopsStructure`, `getWorkshops`, `setWorkshops`, `getWorkshop`, `getWorkshopName`, `workshopOptionsHtml`, `getArea`, `getBlock`, `getBlockForLine`, `getWorkshopIdForLine`, `getAllLinesWithContext` |
| js/data/workshops.js:161 | ОБРАТНАЯ СОВМЕСТИМОСТЬ | `getLines`, `setLines`, `getBlocks`, `setBlocks`, `getAllAreas`, `getLineMachines` |
| js/data/catalog.js:8 | TOP LOSSES — доступ к данным | `getTopLosses`, `getElectronicParams`, `setElectronicParams`, `makeElectronicParamId`, `normalizeElectronicParam`, `normalizeElectronicFrequency`, `getElectronicParamsForLine`, `getElectronicParamsForMachine`, `getElectronicBrandsForLine`, `getElectronicBrandScheduleForLine`, `getElectronicBrandForDate`, `setElectronicBrandForDate`, `setElectronicBrandScheduleBulk`, `setTopLosses` … +26 |
| js/data/schedule.js:8 | РАСПИСАНИЕ CL — ПОНЕДЕЛЬНЫЕ ПРАВКИ (оверрайды) | `getSchWeekStart`, `getScheduleWeeks`, `setScheduleWeeks`, `getScheduleWeekOverride`, `setScheduleWeekOverride`, `hasScheduleWeekOverride` |
| js/data/schedule.js:76 | РАСПИСАНИЕ CL — ВЕРСИИ ШАБЛОНА | `getRowTemplateForWeek`, `getRowForWeek`, `setRowTemplateFrom`, `isShiftPast` |
| js/components/pickers.js:18 | КОММЕНТАРИЙ К ДЕАКТИВАЦИИ | `openDeactivationCommentModal`, `closeDeactivationCommentModal` |
| js/components/pickers.js:124 | TOP LOSSES стандарта — выбор через окно | `openTopLossPickerFor` |
| js/components/pickers.js:143 | Модалка выбора потерь | `openTopLossPickerModal`, `closeTopLossPickerModal`, `getTopLossPickerWorkshop`, `renderTopLossPickerList`, `updateTopLossPickerCounter`, `applyTopLossPicker` |
| js/components/pickers.js:298 | ВЫБОР ТРИГГЕРОВ CHANGE OVER — общая модалка | `openTriggerPickerModal`, `renderTriggerPickerList`, `updateTriggerPickerCounter`, `closeTriggerPickerModal`, `renderTriggerChipsEditable` |
| js/components/line-picker.js:8 | ВЫБОР ЛИНИИ — компактный dropdown (#linePickerModal) | `resetLinePickerState`, `openLinePickerModal`, `closeLinePickerModal`, `renderLinePickerModal`, `renderLinePickerStart`, `renderLinePickerWorkshopView`, `renderLinePickerRecent`, `renderLinePickerBreadcrumbs`, `renderLinePickerAreaTiles`, `renderLinePickerBlockTiles`, `renderLinePickerRowsForArea`, `renderLinePickerRowsForBlock`, `renderLinePickerSearch`, `bindLinePickerEvents` |
| js/components/standard-view.js:8 | ПРОСМОТР СТАНДАРТА — полноценная модалка | `controlTypeLabel`, `formatDateTime`, `openStandardView`, `renderStandardViewHeaderChips`, `renderStandardViewContent`, `closeStandardView` |
| js/components/standard-view.js:198 | ЛАЙТБОКС — просмотр фото | `openLightbox`, `updateLightbox`, `lightboxPrev`, `lightboxNext`, `closeLightbox`, `lightboxKeyHandler`, `closeCommentModal` |
| js/components/quick-add-machine.js:8 | БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра) | `openQuickAddMachineModal`, `closeQuickAddMachineModal` |
| js/components/cil-table.js:9 | ИКОНКИ (Feather) | `cilZoneMap`, `cilSortRows`, `cilDateByDayIdx`, `cilTimeChips`, `cilWorkTag` |
| js/components/cil-table.js:71 | НОРМА / ТОЧКИ | `cilPointsWord`, `cilNorm` |
| js/components/cil-table.js:134 | ШАПКА: дни и смены с бригадами | `cilHeadHtml`, `cilShiftProgress`, `cilTdClass` |
| js/components/mj-notice.js:1 | (начало модуля) | `showMachineJournalNotice`, `closeMachineJournalNotice` |
| js/io/standards-io.js:278 | ПАРСЕР EXCEL — ШАБЛОН OPL (v3: два листа, точки отдельно) | `parseStandardsExcelV3` |
| js/io/standards-io.js:580 | РЕДАКТОР: скачать шаблон OPL для линии | `editorDownloadTemplate` |
| js/io/standards-io.js:698 | РЕДАКТОР: экспорт стандартов линии в XLSX | `editorExportLine` |
| js/views/brand-schedule.js:8 | CL ELECTRONIC — расписание брендов | `getElectronicBrandSchedule`, `setElectronicBrandSchedule` |
| js/views/brand-schedule.js:29 | CL ELECTRONIC — модалка «Расписание брендов» | `openElectronicBrandSchedule`, `closeElectronicBrandSchedule`, `fillBrandSelectOptions` |
| js/views/brand-schedule.js:108 | Режим «По дням» — рендер строк | `renderEbsDailyRows` |
| js/views/brand-schedule.js:167 | Превью итогового расписания | `renderEbsPreview` |
| js/views/cocl/cocl.js:8 | COCL: экран резюме после сохранения проверки | `renderCoclSummary` |
| js/views/cocl/cocl.js:147 | ВКЛАДКА ПРОВЕРКА | `fillLinesForOperator`, `setCoclLine`, `clearCoclLine`, `getCurrentUser`, `fillBrandsForLine`, `updateBrandToOptions`, `renderCoclLineContext`, `renderCoclPartStep`, `updateCoclStepStates`, `openCoclTab`, `onTransitionTypeChange`, `renderMaterialChanges`, `getSelectedTriggers` |
| js/views/cocl/cocl.js:443 | Показ стандарта в Change Over — логика «отличий точек» | `getEffectiveBrandBlock`, `brandBlocksDiffer`, `standardMatchesTriggers`, `updateChecklist`, `renderChecklist` |
| js/views/cocl/cocl.js:718 | COCL: аккордеон — обработчики | `expandCoclItem`, `collapseCoclItem`, `bindCoclAccordionEvents`, `updateCoclItemStatus`, `updateCoclItemStatusFromPoints`, `updateProgress`, `updateCommentUrgency` |
| js/views/cocl/cocl.js:942 | МОДАЛЬНОЕ ОКНО КОММЕНТАРИЯ | `openCommentModal` |
| js/views/cocl/cocl.js:959 | COCL: Сворачивание верхней части и показ чек-листа | `buildChecklistView`, `editChecklistConditions` |
| js/views/cocl/cocl-save.js:7 | СОХРАНЕНИЕ ПРОВЕРКИ | `resetCheckForm` |
| js/views/cl-checklist/cl-checklist.js:8 | CL ELECTRONIC — попадает ли параметр в конкретную дату/смену | `isElectronicParamDue` |
| js/views/cl-checklist/cl-checklist.js:170 | ПРОВЕРКА CL — логика | `openClCheckTab`, `updateClLinePill`, `updateClPartSwitchVisibility`, `updateClCheckButtons`, `updateClContext`, `openClBrandOverrideDialog`, `updateClPanelCount`, `renderClMatrix`, `updateClPartCounts`, `cilIsoWeek`, `clHistoryIndex`, `clRowCells`, `bindClWeekNav`, `renderClRow` … +7 |
| js/views/cl-checklist/quick-check.js:8 | БЫСТРАЯ ПРОВЕРКА — состояние и открытие | `openClCheckModal` |
| js/views/cl-checklist/quick-check.js:184 | БЫСТРАЯ ПРОВЕРКА — закрытие | `closeQuickCheckModal` |
| js/views/cl-checklist/quick-check.js:195 | БЫСТРАЯ ПРОВЕРКА — сохранение | `saveQuickCheck` |
| js/views/cl-checklist/quick-check.js:296 | БЫСТРАЯ ПРОВЕРКА — хелперы | `getRowMeasurementBlock`, `renderQcPointsList`, `updateQcPointStatus`, `openCommentModalElec`, `openElecBrandOverrideDialog` |
| js/views/cl-checklist/cl-save.js:7 | CL Electronic: сохранение проверки (кнопка «Зафиксировать») | `isOkNotOkRecord`, `renderRecordNorm`, `renderRecordAnswer`, `closeRecordModal` |
| js/views/toploss/toploss.js:23 | ИКОНКИ КАТЕГОРИЙ (Feather-стиль) | `tlCatKind` |
| js/views/toploss/toploss.js:36 | ДАННЫЕ | `tlCollectRows`, `tlRecentShifts`, `tlWeekStartOf`, `tlHistoryIndex`, `tlRowShiftStatuses`, `tlLossStats`, `tlLastCheck` |
| js/views/toploss/toploss.js:126 | ЛИНИЯ | `fillTopLossTab`, `setTopLossLine` |
| js/views/toploss/toploss.js:150 | РЕНДЕР ЭКРАНА РАЗБОРА | `renderTopLossCategories`, `renderTopLossSide`, `renderTopLossDiag` |
| js/views/toploss/toploss.js:325 | ОБРАБОТЧИКИ | `backToTopLossSelect` |
| js/views/toploss/toploss-check.js:1 | (начало модуля) | `tlCheckPoints`, `tlCheckStatusFromValues` |
| js/views/toploss/toploss-check.js:52 | ОТКРЫТИЕ ПРОВЕРКИ | `buildTopLossChecklist`, `renderTopLossChecklist`, `updateTlCheckProgress`, `tlCheckRefreshItem` |
| js/views/toploss/toploss-check.js:185 | СОХРАНЕНИЕ | `saveTopLossCheck` |
| js/views/toploss/toploss-check.js:259 | ИТОГ ПРОВЕРКИ | `renderTopLossSummary` |
| js/views/history/history.js:7 | ВКЛАДКА ИСТОРИЯ | `fillHistoryFilters`, `getFilteredHistory` |
| js/views/history/history.js:79 | ИСТОРИЯ: вспомогательные для CL-режимов | `getHistoryModeText`, `formatClShift`, `renderHistory`, `renderHistoryPagination`, `changeHistoryPage`, `changeHistoryPageSize`, `viewRecord` |
| js/views/history/history-export.js:7 | ЭКСПОРТ: детали и CSV | `buildDetailsText`, `buildDetailsTextForCsv`, `exportToCsv` |
| js/views/history/history-export.js:94 | ЭКСПОРТ В XLSX (ExcelJS) | `exportToXlsx`, `buildSheetChecks`, `buildSheetAnalytics` |
| js/views/history/history-export.js:472 | XLSX: лист «Потери» — аналитика по TOP Losses | `buildSheetLosses` |
| js/views/history/history-export.js:589 | XLSX: лист «CL» — аналитика по Чек-листу CL (мех + электро) | `buildSheetCL` |
| js/views/history/history-export.js:707 | СКАЧИВАНИЕ ФАЙЛОВ | `downloadBlob` |
| js/views/dashboard.js:7 | ДАШБОРД | `renderDashboardWorkshopBar`, `renderDashboard`, `renderDashboardTertiaryBlock`, `renderDashboardDaysChart`, `renderDashboardMachineStats`, `renderDashboardWeekDynamics`, `renderDashboardTopLossesStats`, `renderDashboardClParamStats`, `renderDashboardTypesDonut`, `renderDashboardActions`, `renderDashboardAttention`, `renderDashboardMainBlock`, `renderDashboardSecondaryBlock`, `renderDashboardLineStats` … +5 |
| js/views/editor/editor-core.js:8 | РЕДАКТОР: недавние линии и режим просмотра | `getRecentLines`, `addRecentLine` |
| js/views/editor/editor-core.js:117 | Выбор линии | `selectLine` |
| js/views/editor/editor-core.js:167 | Обновление UI: чип + крошки + счётчики | `updateEditorLineContext`, `buildEditorCrumbs` |
| js/views/editor/editor-core.js:245 | Счётчики Maker / Packer | `updatePartCounters` |
| js/views/editor/editor-core.js:281 | Переключатель режима внутри панели | `switchEditorModeInline` |
| js/views/editor/editor-core.js:313 | Сброс линии | `clearEditorLine` |
| js/views/editor/editor-core.js:335 | Обработчики | `bindPartSwitchHandlers` |
| js/views/editor/editor-core.js:419 | РЕДАКТОР: обновление сброса фильтров | `resetMechFilters`, `resetElecFilters` |
| js/views/editor/editor-core.js:533 | РЕДАКТОР: заполнение фильтров | `fillEditorFilters`, `renderEditorMachineChips` |
| js/views/editor/editor-core.js:607 | РЕДАКТОР: переключение активности стандарта | `toggleStandardActive` |
| js/views/editor/editor-core.js:641 | РЕДАКТОР: копирование стандарта | `copyStandardNew` |
| js/views/editor/editor-core.js:670 | РЕДАКТОР: удаление стандарта | `deleteStandardNew` |
| js/views/editor/editor-mech.js:7 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация | `getFilteredMechStandards`, `editorAppliesMatch`, `editorRowSchedule` |
| js/views/editor/editor-mech.js:59 | СТАНДАРТЫ CL: общие куски строки таблицы | `etAppliesHtml`, `etTypeNormHtml`, `etScheduleHtml`, `etStatusHtml`, `etGroupRow`, `etPluralStd` |
| js/views/editor/editor-mech.js:116 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы | `refreshEditorMechTable`, `updateMechSelectionUI`, `renderEditorMechPagination` |
| js/views/editor/editor-elec.js:7 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация | `getFilteredElecParams`, `etPluralParam` |
| js/views/editor/editor-elec.js:48 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы | `refreshEditorElecTable`, `updateElecSelectionUI`, `renderEditorElecPagination` |
| js/views/editor/editor-elec.js:244 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: экспорт / импорт / шаблон | `serializeValuesByBrand`, `parseValuesByBrand`, `editorElecDownloadTemplate`, `editorElecExport`, `parseElectronicParamsExcel` |
| js/views/editor/eparam-page.js:9 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА | `getEparamNormRange`, `getEparamNormLabel`, `openEparamPage`, `closeEparamPage`, `renderEparamPage`, `renderEparamMainFields`, `renderEparamNorm`, `syncEparamRowsFromDom`, `renderEparamRelated`, `renderEparamExtra` |
| js/views/standard-page/standard-page.js:8 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full) — открытие и заполнение | `openStandardFullView` |
| js/views/standard-page/standard-page.js:56 | СОЗДАНИЕ МЕХАНИЧЕСКОГО СТАНДАРТА | `openStandardCreatePage`, `closeStandardFullView`, `renderStandardFullView`, `renderSvFullCrumbs` |
| js/views/standard-page/standard-page.js:239 | Основная информация — поля | `renderSvMainFields`, `svFieldRow`, `formatSvDuration` |
| js/views/standard-page/standard-page.js:375 | Точки контроля и описание — блоки | `renderSvContentBlocks`, `buildSvContentBlocksHtml`, `svContentBlockEditable` |
| js/views/standard-page/standard-page.js:474 | Контроль правильности — таблица брендов × точек | `renderSvControlSection`, `renderReadonlyBrandsTable`, `renderSvBrandBlocksView` |
| js/views/standard-page/standard-page.js:555 | Таблица брендов × точек — рендер в новом экране | `renderSvBrandsTable`, `getSvTableState`, `renderSvBrandsTableFromState`, `bindSvControlEvents` |
| js/views/standard-page/standard-page-extra.js:8 | Фото | `renderSvFullPhotos` |
| js/views/standard-page/standard-page-extra.js:137 | Связанные объекты | `renderSvFullRelated` |
| js/views/standard-page/standard-page-extra.js:174 | Дополнительная информация (Применять к, Триггеры, Top Losses | `renderSvFullExtra` |
| js/views/standard-page/standard-page-extra.js:372 | Заглушки для таблиц вкладок | `renderSvAckTable`, `renderSvHistoryTable`, `renderSvCommentsTable` |
| js/views/standard-page/standard-page-extra.js:417 | Переключение вкладок внутри просмотра | `switchSvFullTab` |
| js/views/schedule/schedule.js:8 | РАСПИСАНИЕ CL — вкладка аналитика | `openScheduleTab`, `updateSchLinePill`, `updateSchPanelCount`, `isSchRowMember`, `getFilteredScheduleRows`, `updateSchMatrixCounters`, `fillSchMachineFilter`, `renderScheduleMatrix` |
| js/views/schedule/schedule.js:414 | РАСПИСАНИЕ CL — время проверки (timeWindows) | `getTimeWindowShift`, `openTimeWindowsModal`, `closeTimeWindowsModal`, `renderTimeWindowsList`, `addTimeWindow`, `saveTimeWindows`, `getSchRowFreq`, `getClRowFreq`, `getCheckedStandardIdsForWeek`, `ensureSchDraft`, `renderScheduleRow`, `isSchReadOnly`, `removeRowFromSchedule`, `schSetCell` … +8 |
| js/views/schedule/schedule-add.js:7 | РАСПИСАНИЕ CL — модалка добавления стандартов | `openScheduleAddStandardsModal`, `closeScheduleAddStandardsModal`, `renderSchAddList`, `toggleSchAddItem`, `updateSchAddCounter`, `updateSchAddCheckAllState`, `confirmScheduleAddStandards`, `selectLine` |
| js/views/settings/settings-shell.js:23 | ОТРИСОВКА ВСЕЙ ВКЛАДКИ | `renderSettings`, `getSavedSettingsPanel`, `showSettingsPanel`, `updateSettingsNavCounts` |
| js/views/settings/settings-shell.js:78 | ОБЩИЕ ПОМОЩНИКИ РАЗДЕЛОВ | `settingsChipsHtml`, `settingsSearchHtml`, `settingsHighlight`, `startInlineEdit`, `settingsWorkshopChipItems` |
| js/views/settings/structure-tree.js:20 | ДАННЫЕ | `stFindOwner`, `stDetachLine`, `stLineUsage`, `stOrphanLines`, `stAddLine`, `stMoveLine`, `stDeleteLine`, `stAddBlock`, `stRenameBlock`, `stDeleteBlock`, `stAddMachine`, `stRenameMachine`, `removeMachineFromLine`, `stToggleBrand` … +2 |
| js/views/settings/structure-tree.js:275 | ДЕРЕВО | `renderStructureSettings` |
| js/views/settings/structure-tree.js:405 | КАРТОЧКА ЛИНИИ | `renderStructureLineCard` |
| js/views/settings/shifts.js:7 | ГРАФИК СМЕН — конфигурация (cl_electronic_shiftcfg_v1) | `sanitizeCycleArray`, `getElectronicShiftConfig`, `setElectronicShiftConfig` |
| js/views/settings/shifts.js:69 | НАСТРОЙКИ: раздел «Смены» — редактор цикла бригад | `shfIsDirty`, `shfBrigadesFor`, `renderElectronicShiftSettings`, `renderElectronicShiftPreview`, `pluralizeLines` |
| js/views/settings/toplosses.js:7 | TOP LOSSES — категории по цехам, правка в строке | `pluralizeLosses`, `tlCategoryKind`, `renderTopLossesSettings`, `tlSaveItem`, `deleteTopLossItem`, `deleteOperator` |
| js/views/settings/toplosses.js:186 | TOP LOSSES — шаблон и импорт Excel | `parseTopLossesExcel`, `parseOperatorsExcel`, `showImportReport` |
| js/views/settings/brands.js:7 | ОБЩИЙ СПИСОК БРЕНДОВ — справочник с фильтром по цеху | `pluralizeBrandsShort`, `getLinesForBrand`, `renderBrandsSettings`, `addBrandInline`, `renameBrand`, `deleteBrand` |
| js/views/settings/brands.js:224 | ИМПОРТ/ЭКСПОРТ БРЕНДОВ | `parseBrandsExcel` |
| js/views/settings/operators.js:7 | ОПЕРАТОРЫ — строки + inline + пагинация | `renderOperatorsSettings`, `highlightOperatorName`, `renderOperatorsPagination`, `changeOperatorsPage`, `sortOperatorsRus`, `openAddOperatorModal`, `closeAddOperatorModal` |
| js/views/settings/triggers.js:7 | НАСТРОЙКИ: пользовательские триггеры Change Over | `renderCustomTriggersSettings`, `addCustomTriggerInline`, `updateCustomTrigger`, `deleteCustomTrigger`, `getAvailableLines`, `getBrandsForLine` |
| js/views/settings/photos.js:7 | КАРТОЧКА «ХРАНИЛИЩЕ ФОТО» | `renderPhotoStorageSettings` |
| js/views/settings/photos.js:28 | ПРОВЕРКА ФОТОГРАФИЙ НА БИТЫЕ ССЫЛКИ | `checkPhotoExists`, `runPhotosCheck`, `renderPhotosCheckResult`, `buildPhotosCheckReport`, `closePhotosCheckModal` |
| js/views/settings/photos.js:232 | ХРАНИЛИЩЕ ФОТО — обработчики | `fallbackCopy` |
| js/app.js:8 | ЧАСЫ | `tickClock` |
| js/app.js:14 | СЧЁТЧИКИ В SIDEBAR | `updateNavHistoryCounter`, `updateNavSettingsBadge`, `updateNavCounters` |
| js/app.js:62 | ИНИЦИАЛИЗАЦИЯ | `init` |

## CSS (в порядке каскада)

Точка входа `style.css`: @import в этом порядке + anti-flash + печать. Переменные темы — `css/base.css`. Порядок @import менять нельзя — от него зависит каскад.

| Файл | Строк | Блоки |
| --- | --- | --- |
| `css/base.css` | 190 | BASE — переменные, сброс, типографика, ф; ТЕМА: Дневная (light) — по умолчанию; ТЕМА: Ночная (dark); Сброс; Формы; Скроллбар |
| `css/layout.css` | 458 | LAYOUT — header, sidebar, main, tabs, fo; Header; Layout; Вкладки; Sidebar; Кнопка закрепления sidebar … +7 |
| `css/components/ui-base.css` | 761 | Cards; Layout; Checkbox chips; Кнопки; Checklist items; Ответ в чек-листе: всё в одну строку … +13 |
| `css/views/cocl-panel.css` | 321 | COCL: панель условий проверки; Селектор типа перехода — чипы |
| `css/components/forms.css` | 184 | Компактные чекбоксы типов (Редактор); Автокомплит; Импорт: отчёт по ошибкам; Компактный список с поиском |
| `css/components/points.css` | 259 | Панель кнопок внизу карточки; Input error; Форма стандарта; Строка «селект + кнопка»; Опция «не в списке» в выпадающем списке ; Точки замера — динамический список … +2 |
| `css/views/settings-photo-card.css` | 78 | Карточка «Хранилище фото» |
| `css/views/dashboard.css` | 700 | ДАШБОРД: карточки-счётчики; ДАШБОРД: двухколоночный layout + виджеты; ДАШБОРД: бары по линиям и операторам; ДАШБОРД: столбики по дням; ДАШБОРД: круговая по типам; ДАШБОРД: быстрые действия … +1 |
| `css/components/photos.css` | 532 | Результат проверки фото; Фотографии в форме стандарта; Строка добавления фото (textarea + кнопк; МОДАЛКА ПРОСМОТРА СТАНДАРТА; Чипы в шапке модалки просмотра стандарта; ЛАЙТБОКС … +1 |
| `css/components/theme-transition.css` | 60 | Плавный переход при смене темы |
| `css/views/editor-table.css` | 204 | Блоки в редакторе — плитки; Хлебные крошки; Пагинация; ТАБЛИЦА СТАНДАРТОВ; Кнопки-иконки (векторные SVG); Кнопки «иконка + текст» |
| `css/views/toploss.css` | 883 | TOP LOSSES — вкладка (экран выбора); TOP LOSSES — экран резюме (Этап 4.2); ИСТОРИЯ: режимы (COCL / TOP Losses); TOP LOSSES: новое резюме (визуальное); TOP LOSSES: статус «Не проверено»; TOP LOSSES: подсказка про Journal Machin … +7 |
| `css/views/cl-electronic.css` | 1226 | CL ELECTRONIC: дерево в редакторе; CL ELECTRONIC: расписание брендов; CL ELECTRONIC: вкладка оператора; CL ELECTRONIC: тулбар над матрицей недел; CL ELECTRONIC: матрица недели; CL Electronic: строка ответа и статус … +5 |
| `css/views/settings-brands-operators.css` | 104 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам; ОПЕРАТОРЫ — строки + inline + пагинация; Подсветка совпадений поиска |
| `css/components/points-table.css` | 345 | Чек-лист: блок точек замера; Точки замера: таблица по брендам; Модалка просмотра стандарта: блоки бренд |
| `css/views/cocl-accordion.css` | 291 | COCL: карточка «Сформировать проверку»; COCL: аккордеон чек-листа у оператора; COCL: кнопка комментария в шапке аккорде |
| `css/views/toploss-accordion.css` | 93 | Модалка выбора потерь |
| `css/views/editor.css` | 778 | Редактор: список линий в блоке; CL Electronic: аккордеон в «Параметры на; РЕДАКТОР: чипы типов (ChangeOver / CL_TO; РЕДАКТОР: единая панель + фильтры + табл; РЕДАКТОР: карточка таблицы; РЕДАКТОР: таблица стандартов … +7 |
| `css/components/line-picker.css` | 312 | МОДАЛКА-ВЫБОР ЛИНИИ (компактный dropdown |
| `css/views/editor-part-switch.css` | 75 | РЕДАКТОР: переключатель по части линии |
| `css/views/schedule.css` | 462 | РАСПИСАНИЕ CL: матрица (с инфо-колонками; Тулбар над матрицей: фильтр+поиск слева,; Пустое состояние; Панель массовых операций; Адаптив; РАСПИСАНИЕ CL: модалка добавления станда … +1 |
| `css/views/cl-checklist.css` | 280 | ПРОВЕРКА CL: контекстная строка; БЫСТРАЯ ПРОВЕРКА: точки замера; БЫСТРАЯ ПРОВЕРКА: блок «Как проверять» |
| `css/views/schedule-time.css` | 187 | МОДАЛКА ВРЕМЕНИ ПРОВЕРКИ |
| `css/views/standard-page.css` | 1018 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full); Шапка; Вкладки внутри; Контент; Карточки; Поля «Основная информация» … +10 |
| `css/views/eparam-page.css` | 115 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА |
| `css/views/settings.css` | 895 | НАСТРОЙКИ: каркас, меню разделов, справо; СТРУКТУРА: дерево + карточка линии; TOP LOSSES: категории цеха карточками; Адаптив; СТРУКТУРА: перенос линии; БРЕНДЫ: сетка плиток … +1 |
| `css/components/cil-table.css` | 440 | ТАБЛИЦА НЕДЕЛИ В СТИЛЕ CIL; Чек-лист CL и Расписание CL |

## Ключи localStorage

| Ключ | Где объявлен |
| --- | --- |
| `cl_active_tab` | js/router.js:104 |
| `cl_blocks_v1` | STORAGE_KEYS.blocks (js/core/state.js) |
| `cl_brandWorkshops_v1` | STORAGE_KEYS.brandWorkshops (js/core/state.js) |
| `cl_brands_v2` | STORAGE_KEYS.brands (js/core/state.js) |
| `cl_brands_ws_autoassign_v1` | js/data/catalog.js:378 |
| `cl_cl_line` | js/views/cl-checklist/cl-checklist.js:177 |
| `cl_cl_mode` | js/views/cl-checklist/cl-checklist.js:175 |
| `cl_cl_part` | js/views/cl-checklist/cl-checklist.js:176 |
| `cl_current_user` | js/views/cocl/cocl.js:189 |
| `cl_custom_triggers_v1` | STORAGE_KEYS.customTriggers (js/core/state.js) |
| `cl_dashboard_workshop` | js/views/dashboard.js:29 |
| `cl_editor_block` | js/core/modal.js:130 |
| `cl_editor_line` | js/router.js:59 |
| `cl_editor_mode` | js/router.js:45 |
| `cl_elec_subtab` | js/views/cl-checklist/cl-checklist.js:61 |
| `cl_electronic_brandschedule_v1` | STORAGE_KEYS.electronicBrandSchedule (js/core/state.js) |
| `cl_electronic_params_v1` | STORAGE_KEYS.electronicParams (js/core/state.js) |
| `cl_electronic_shiftcfg_v1` | STORAGE_KEYS.electronicShiftCfg (js/core/state.js) |
| `cl_history_v2` | STORAGE_KEYS.history (js/core/state.js) |
| `cl_lineBrands_v2` | STORAGE_KEYS.lineBrands (js/core/state.js) |
| `cl_lineMachines_v1` | STORAGE_KEYS.lineMachines (js/core/state.js) |
| `cl_lines_v2` | STORAGE_KEYS.lines (js/core/state.js) |
| `cl_nodes_v2` | STORAGE_KEYS.nodes (js/core/state.js) |
| `cl_operators_v2` | STORAGE_KEYS.operators (js/core/state.js) |
| `cl_photos_broken_count` | js/views/dashboard.js:1170 |
| `cl_recent_lines` | js/views/editor/editor-core.js:12 |
| `cl_schedule_line` | js/views/schedule/schedule.js:35 |
| `cl_schedule_mode` | js/views/schedule/schedule.js:34 |
| `cl_schedule_part` | js/views/schedule/schedule.js:36 |
| `cl_schedule_weeks_v1` | STORAGE_KEYS.scheduleWeeks (js/core/state.js) |
| `cl_settings_panel` | js/views/settings/settings-shell.js:9 |
| `cl_shifts_v2` | STORAGE_KEYS.shifts (js/core/state.js) |
| `cl_sidebar_pinned` | js/router.js:116 |
| `cl_standards_v3` | STORAGE_KEYS.standards (js/core/state.js) |
| `cl_theme` | js/app.js:110 |
| `cl_tl_line` | js/views/toploss/toploss.js:10 |
| `cl_toploss_ws_split_v1` | js/data/catalog.js:293 |
| `cl_toplosses_v1` | STORAGE_KEYS.topLosses (js/core/state.js) |
| `cl_triggers_ws_v1` | js/data/catalog.js:442 |
| `cl_workshops_migration_smd_cell_named` | js/data/workshops.js:24 |
| `cl_workshops_v1` | STORAGE_KEYS.workshops (js/core/state.js) |
