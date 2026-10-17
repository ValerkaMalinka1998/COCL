# Карта проекта COCL

Сгенерировано 2026-10-17 по коммиту `97b27a8 app.js разбит на 41 модуль в js/ без изменения поведения` скриптом `.claude/skills/cocl-session-close/scripts/gen_project_map.py` — пересоздавайте после крупных правок.

JS — 42 модулей, 19826 строк, 487 функций · CSS — 29 файлов, 13257 строк.
Как искать: модуль по назначению → раздел в таблице ниже → `Grep` по имени функции в этом файле.

## JS-модули (в порядке подключения в index.html)

Все модули — обычные `<script>` с общим пространством имён. Код, выполняемый при загрузке, не может ссылаться на модули, подключённые позже — проверка: `node .claude/skills/cocl-review/scripts/check_load_order.js`.

| Модуль | Строк | Функций | Назначение |
| --- | --- | --- | --- |
| `js/router.js` | 170 | 2 | РОУТЕР — навигация между вкладками с сохранением в URL |
| `js/core/utils.js` | 78 | 13 | ЯДРО: утилиты |
| `js/core/state.js` | 154 | 0 | ЯДРО: константы и состояние |
| `js/core/dates.js` | 135 | 13 | ЯДРО: даты, недели, смены |
| `js/core/modal.js` | 134 | 4 | ЯДРО: стек модальных окон |
| `js/data/standards.js` | 241 | 11 | ДАННЫЕ: стандарты и история |
| `js/data/workshops.js` | 237 | 17 | ДАННЫЕ: структура производства |
| `js/data/catalog.js` | 471 | 40 | ДАННЫЕ: справочники |
| `js/data/schedule.js` | 179 | 10 | ДАННЫЕ: расписание CL |
| `js/components/pickers.js` | 396 | 13 | КОМПОНЕНТЫ: окна выбора |
| `js/components/line-picker.js` | 368 | 14 | КОМПОНЕНТЫ: выбор линии |
| `js/components/standard-view.js` | 314 | 13 | КОМПОНЕНТЫ: окно просмотра стандарта |
| `js/io/excel-common.js` | 52 | 0 | EXCEL: общие функции шаблонов |
| `js/io/standards-io.js` | 822 | 3 | EXCEL: импорт и экспорт стандартов |
| `js/views/brand-schedule.js` | 396 | 7 | ВКЛАДКА CL: расписание брендов |
| `js/views/cocl/cocl.js` | 1019 | 29 | ВКЛАДКА «Проверка COCL» |
| `js/views/cocl/cocl-save.js` | 173 | 1 | ВКЛАДКА «Проверка COCL»: сохранение |
| `js/views/cl-checklist/cl-checklist.js` | 927 | 19 | ВКЛАДКА «Чек-лист CL» |
| `js/views/cl-checklist/quick-check.js` | 435 | 8 | ВКЛАДКА «Чек-лист CL»: быстрая проверка |
| `js/views/cl-checklist/cl-save.js` | 197 | 4 | ВКЛАДКА «Чек-лист CL»: сохранение в историю |
| `js/views/toploss.js` | 1099 | 24 | ВКЛАДКА «TOP Losses» |
| `js/views/history/history.js` | 463 | 9 | ВКЛАДКА «История» |
| `js/views/history/history-export.js` | 728 | 9 | ИСТОРИЯ: экспорт CSV / XLSX |
| `js/views/dashboard.js` | 1394 | 19 | ВКЛАДКА «Дашборд» |
| `js/views/editor/editor-core.js` | 764 | 15 | ВКЛАДКА «Стандарты CL»: каркас |
| `js/views/editor/editor-mech.js` | 431 | 7 | СТАНДАРТЫ CL: таблица механических стандартов |
| `js/views/editor/editor-elec.js` | 546 | 9 | СТАНДАРТЫ CL: таблица электронных параметров + Excel |
| `js/views/editor/eparam-page.js` | 545 | 10 | СТРАНИЦА электронного параметра |
| `js/views/standard-page/standard-page.js` | 730 | 18 | СТРАНИЦА стандарта: открытие, поля, точки |
| `js/views/standard-page/standard-page-extra.js` | 655 | 7 | СТРАНИЦА стандарта: фото, связи, доп. информация, сохранение |
| `js/views/schedule/schedule.js` | 1024 | 27 | ВКЛАДКА «Расписание CL» |
| `js/views/schedule/schedule-add.js` | 438 | 8 | РАСПИСАНИЕ CL: добавление стандартов |
| `js/views/settings/structure.js` | 563 | 15 | НАСТРОЙКИ: блоки линий |
| `js/views/settings/shifts.js` | 142 | 6 | НАСТРОЙКИ: график смен |
| `js/views/settings/machines.js` | 650 | 14 | НАСТРОЙКИ: машины линий |
| `js/views/settings/toplosses.js` | 838 | 17 | НАСТРОЙКИ: Top Losses |
| `js/views/settings/brands.js` | 491 | 12 | НАСТРОЙКИ: общий список брендов |
| `js/views/settings/line-brands.js` | 494 | 11 | НАСТРОЙКИ: бренды линий |
| `js/views/settings/operators.js` | 218 | 7 | НАСТРОЙКИ: операторы |
| `js/views/settings/triggers.js` | 241 | 10 | НАСТРОЙКИ: триггеры Change Over |
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
| js/components/pickers.js:133 | Модалка выбора потерь | `openTopLossPickerModal`, `closeTopLossPickerModal`, `getTopLossPickerWorkshop`, `renderTopLossPickerList`, `updateTopLossPickerCounter`, `applyTopLossPicker` |
| js/components/pickers.js:274 | ВЫБОР ТРИГГЕРОВ CHANGE OVER — общая модалка | `openTriggerPickerModal`, `renderTriggerPickerList`, `updateTriggerPickerCounter`, `closeTriggerPickerModal`, `renderTriggerChipsEditable` |
| js/components/line-picker.js:8 | ВЫБОР ЛИНИИ — компактный dropdown (#linePickerModal) | `resetLinePickerState`, `openLinePickerModal`, `closeLinePickerModal`, `renderLinePickerModal`, `renderLinePickerStart`, `renderLinePickerWorkshopView`, `renderLinePickerRecent`, `renderLinePickerBreadcrumbs`, `renderLinePickerAreaTiles`, `renderLinePickerBlockTiles`, `renderLinePickerRowsForArea`, `renderLinePickerRowsForBlock`, `renderLinePickerSearch`, `bindLinePickerEvents` |
| js/components/standard-view.js:8 | ПРОСМОТР СТАНДАРТА — полноценная модалка | `controlTypeLabel`, `formatDateTime`, `openStandardView`, `renderStandardViewHeaderChips`, `renderStandardViewContent`, `closeStandardView` |
| js/components/standard-view.js:198 | ЛАЙТБОКС — просмотр фото | `openLightbox`, `updateLightbox`, `lightboxPrev`, `lightboxNext`, `closeLightbox`, `lightboxKeyHandler`, `closeCommentModal` |
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
| js/views/cl-checklist/cl-checklist.js:170 | ПРОВЕРКА CL — логика | `openClCheckTab`, `updateClLinePill`, `updateClPartSwitchVisibility`, `updateClCheckButtons`, `updateClContext`, `openClBrandOverrideDialog`, `updateClPanelCount`, `renderClMatrix`, `bindClWeekNav`, `renderClRow`, `renderClRowNorm`, `fmtNum`, `findExistingCheck`, `bindClCells` … +4 |
| js/views/cl-checklist/quick-check.js:8 | БЫСТРАЯ ПРОВЕРКА — состояние и открытие | `openClCheckModal` |
| js/views/cl-checklist/quick-check.js:184 | БЫСТРАЯ ПРОВЕРКА — закрытие | `closeQuickCheckModal` |
| js/views/cl-checklist/quick-check.js:195 | БЫСТРАЯ ПРОВЕРКА — сохранение | `saveQuickCheck` |
| js/views/cl-checklist/quick-check.js:296 | БЫСТРАЯ ПРОВЕРКА — хелперы | `getRowMeasurementBlock`, `renderQcPointsList`, `updateQcPointStatus`, `openCommentModalElec`, `openElecBrandOverrideDialog` |
| js/views/cl-checklist/cl-save.js:7 | CL Electronic: сохранение проверки (кнопка «Зафиксировать») | `isOkNotOkRecord`, `renderRecordNorm`, `renderRecordAnswer`, `closeRecordModal` |
| js/views/toploss.js:7 | ВКЛАДКА TOP LOSSES — ЭКРАН ВЫБОРА ПОТЕРЬ (Этап 3) | `fillTopLossTab`, `fillTopLossLines`, `countStandardsForLoss`, `renderTopLossCategories`, `toggleTopLossCategory`, `toggleTopLossSelection`, `updateTlSelectedCounter`, `resetTopLossSelection`, `buildTopLossChecklist`, `collectStandardsForLosses` |
| js/views/toploss.js:307 | TOP LOSSES: рендер чек-листа — аккордеон | `renderTopLossChecklist`, `bindTopLossAccordionEvents`, `updateTlItemStatus`, `toggleAnswerBlock`, `updateItemAnsweredBadge`, `updateTlProgressFooter`, `startTopLossCheck`, `cancelTopLossCheck`, `updateTlChecklistProgress`, `saveTopLossCheck`, `renderTopLossSummary`, `backToTopLossList`, `checkAnotherTopLoss`, `backToTopLossSelect` |
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
| js/views/editor/editor-core.js:169 | Обновление UI: чип + крошки + счётчики | `updateEditorLineContext`, `buildEditorCrumbs` |
| js/views/editor/editor-core.js:243 | Счётчики Maker / Packer | `updatePartCounters` |
| js/views/editor/editor-core.js:279 | Переключатель режима внутри панели | `switchEditorModeInline` |
| js/views/editor/editor-core.js:311 | Сброс линии | `clearEditorLine` |
| js/views/editor/editor-core.js:339 | Обработчики | `bindPartSwitchHandlers` |
| js/views/editor/editor-core.js:423 | РЕДАКТОР: обновление сброса фильтров | `resetMechFilters`, `resetElecFilters` |
| js/views/editor/editor-core.js:536 | РЕДАКТОР: заполнение фильтров | `fillEditorFilters` |
| js/views/editor/editor-core.js:614 | РЕДАКТОР: переключение активности стандарта | `toggleStandardActive` |
| js/views/editor/editor-core.js:648 | РЕДАКТОР: копирование стандарта | `copyStandardNew` |
| js/views/editor/editor-core.js:677 | РЕДАКТОР: удаление стандарта | `deleteStandardNew` |
| js/views/editor/editor-mech.js:7 | РЕДАКТОР: парсинг нормы (для колонок) | `formatEditorDate` |
| js/views/editor/editor-mech.js:21 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация | `getFilteredMechStandards` |
| js/views/editor/editor-mech.js:110 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы | `refreshEditorMechTable`, `lineContextCacheForLine`, `renderMechTypeChips`, `updateMechSelectionUI`, `renderEditorMechPagination` |
| js/views/editor/editor-elec.js:7 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация | `getFilteredElecParams` |
| js/views/editor/editor-elec.js:66 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы | `refreshEditorElecTable`, `updateElecSelectionUI`, `renderEditorElecPagination` |
| js/views/editor/editor-elec.js:339 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: экспорт / импорт / шаблон | `serializeValuesByBrand`, `parseValuesByBrand`, `editorElecDownloadTemplate`, `editorElecExport`, `parseElectronicParamsExcel` |
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
| js/views/schedule/schedule.js:8 | РАСПИСАНИЕ CL — вкладка технолога | `openScheduleTab`, `updateSchLinePill`, `updateSchPanelCount`, `isSchRowMember`, `getFilteredScheduleRows`, `updateSchMatrixCounters`, `fillSchMachineFilter`, `renderScheduleMatrix` |
| js/views/schedule/schedule.js:433 | РАСПИСАНИЕ CL — время проверки (timeWindows) | `getTimeWindowShift`, `openTimeWindowsModal`, `closeTimeWindowsModal`, `renderTimeWindowsList`, `addTimeWindow`, `saveTimeWindows`, `getSchRowFreq`, `getClRowFreq`, `getCheckedStandardIdsForWeek`, `ensureSchDraft`, `renderScheduleRow`, `isSchReadOnly`, `removeRowFromSchedule`, `bindScheduleCells` … +5 |
| js/views/schedule/schedule-add.js:7 | РАСПИСАНИЕ CL — модалка добавления стандартов | `openScheduleAddStandardsModal`, `closeScheduleAddStandardsModal`, `renderSchAddList`, `toggleSchAddItem`, `updateSchAddCounter`, `updateSchAddCheckAllState`, `confirmScheduleAddStandards`, `selectLine` |
| js/views/settings/structure.js:7 | ВКЛАДКА НАСТРОЙКИ | `renderSettings` |
| js/views/settings/structure.js:21 | БЛОКИ ЛИНИЙ — сворачиваемые группы Цех → Участок | `renderBlocksSettings`, `getBlOpenGroups`, `setBlOpenGroups`, `sanitizeCycleArray`, `getElectronicShiftConfig`, `setElectronicShiftConfig` |
| js/views/settings/structure.js:303 | МОДАЛКА РЕДАКТИРОВАНИЯ БЛОКА | `openBlockModal`, `closeBlockModal`, `renderBlockModalLines`, `blockModalLineLabel`, `addBlockModalNewLine`, `confirmBlockModalRemovedLines`, `openAreaLinesModal`, `openNewBlockModal` |
| js/views/settings/shifts.js:7 | CL ELECTRONIC — карточка «График смен» | `renderElectronicShiftSettings`, `renderElectronicShiftPreview`, `pluralizeLines`, `parseCycleString`, `updateShiftPreviewTemporary`, `deleteBlock` |
| js/views/settings/machines.js:7 | МАШИНЫ ДЛЯ ЛИНИЙ — компактные строки + аккордеон по блокам | `getLmOpenBlocks`, `setLmOpenBlocks`, `renderLineMachinesSettings`, `renderLmLineRow`, `collectAllLmGroupIds`, `updateLmToggleAllBtnMultiLevel`, `applyLmSearch` |
| js/views/settings/machines.js:411 | МОДАЛКА СПИСКА МАШИН ЛИНИИ | `openMachinesListModal`, `closeMachinesListModal`, `renderMachinesListContent` |
| js/views/settings/machines.js:484 | МОДАЛКА МАШИНЫ | `openMachineModal` |
| js/views/settings/machines.js:503 | БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра) | `openQuickAddMachineModal`, `closeQuickAddMachineModal`, `closeMachineModal` |
| js/views/settings/toplosses.js:7 | TOP LOSSES — категории (аккордеон + inline-потери) | `getTlOpenCats`, `setTlOpenCats`, `renderTopLossesSettings`, `getTlOpenWorkshops`, `setTlOpenWorkshops`, `updateTlCatToggleAllBtn`, `applyTlCatSearch`, `pluralizeLosses`, `pluralizeMachines`, `removeMachineFromLine` |
| js/views/settings/toplosses.js:409 | TOP LOSSES — модалки: потеря | `closeTopLossItemModal`, `deleteTopLossItem`, `deleteOperator`, `deleteBrand` |
| js/views/settings/toplosses.js:549 | TOP LOSSES — шаблон и импорт Excel | `parseTopLossesExcel`, `parseOperatorsExcel`, `showImportReport` |
| js/views/settings/brands.js:7 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам | `getBrandsOpenGroups`, `setBrandsOpenGroups`, `renderBrandsSettings`, `brandRowHtml`, `highlightBrandName` |
| js/views/settings/brands.js:127 | РЕДАКТИРОВАНИЕ БРЕНДА | `openEditBrandModal`, `closeEditBrandModal`, `renderLinesCheckboxesGroup`, `collectSelectedLines`, `openAddBrandModal`, `closeAddBrandModal` |
| js/views/settings/brands.js:362 | ИМПОРТ/ЭКСПОРТ БРЕНДОВ | `parseBrandsExcel` |
| js/views/settings/line-brands.js:7 | БРЕНДЫ ДЛЯ ЛИНИЙ — аккордеон по блокам + строки + поиск | `getLbOpenBlocks`, `setLbOpenBlocks`, `renderLineBrandsSettings`, `renderLbLineRow`, `collectAllLbGroupIds`, `updateLbToggleAllBtnMultiLevel`, `applyLbSearch`, `pluralizeBrandsShort`, `openLineBrandsModal`, `closeLineBrandsModal`, `renderLineBrandsChecklist` |
| js/views/settings/operators.js:7 | ОПЕРАТОРЫ — строки + inline + пагинация | `renderOperatorsSettings`, `highlightOperatorName`, `renderOperatorsPagination`, `changeOperatorsPage`, `sortOperatorsRus`, `openAddOperatorModal`, `closeAddOperatorModal` |
| js/views/settings/triggers.js:7 | НАСТРОЙКИ: пользовательские триггеры Change Over | `renderCustomTriggersSettings`, `renderCtList`, `getCtOpenGroups`, `setCtOpenGroups`, `openCustomTriggerModal`, `updateCustomTriggerPartField`, `closeCustomTriggerModal`, `deleteCustomTrigger`, `getAvailableLines`, `getBrandsForLine` |
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
| `css/views/settings-line-brands.css` | 425 | БРЕНДЫ ДЛЯ ЛИНИЙ — строки + аккордеон по; Модальное окно: чек-лист брендов |
| `css/components/points.css` | 259 | Панель кнопок внизу карточки; Input error; Форма стандарта; Строка «селект + кнопка»; Опция «не в списке» в выпадающем списке ; Точки замера — динамический список … +2 |
| `css/views/settings-photo-card.css` | 78 | Карточка «Хранилище фото» |
| `css/views/dashboard.css` | 700 | ДАШБОРД: карточки-счётчики; ДАШБОРД: двухколоночный layout + виджеты; ДАШБОРД: бары по линиям и операторам; ДАШБОРД: столбики по дням; ДАШБОРД: круговая по типам; ДАШБОРД: быстрые действия … +1 |
| `css/components/photos.css` | 521 | Результат проверки фото; Фотографии в форме стандарта; Строка добавления фото (textarea + кнопк; МОДАЛКА ПРОСМОТРА СТАНДАРТА; Чипы в шапке модалки просмотра стандарта; ЛАЙТБОКС |
| `css/components/theme-transition.css` | 60 | Плавный переход при смене темы |
| `css/views/settings-blocks.css` | 257 | Блоки линий — компактный список; Блоки линий — сворачиваемые группы; Машины для линий — компактный список |
| `css/views/settings-toplosses.css` | 305 | TOP LOSSES — категории (аккордеон + inli |
| `css/views/settings-machines.css` | 479 | МАШИНЫ ДЛЯ ЛИНИЙ — строки + аккордеон по; Машины внутри модалки; Линии производства — компактная сетка |
| `css/views/editor-table.css` | 570 | Блоки в редакторе — плитки; Хлебные крошки; Пагинация; ТАБЛИЦА СТАНДАРТОВ; Бейдж «кол-во фото» в таблице стандартов; Комментарий к деактивации … +2 |
| `css/views/toploss.css` | 1292 | TOP LOSSES — вкладка (экран выбора); Блок Top Losses в форме стандарта; TOP LOSSES — экран резюме (Этап 4.2); ИСТОРИЯ: режимы (COCL / TOP Losses); TOP LOSSES: подсветка счётчиков; АДАПТИВ ТАБЛИЦЫ СТАНДАРТОВ … +13 |
| `css/views/cl-electronic.css` | 1263 | CL Electronic: график смен; CL ELECTRONIC: дерево в редакторе; CL ELECTRONIC: расписание брендов; CL ELECTRONIC: вкладка оператора; CL ELECTRONIC: тулбар над матрицей недел; CL ELECTRONIC: матрица недели … +6 |
| `css/views/settings-brands-operators.css` | 187 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам; ОПЕРАТОРЫ — строки + inline + пагинация; Подсветка совпадений поиска |
| `css/components/points-table.css` | 345 | Чек-лист: блок точек замера; Точки замера: таблица по брендам; Модалка просмотра стандарта: блоки бренд |
| `css/views/cocl-accordion.css` | 291 | COCL: карточка «Сформировать проверку»; COCL: аккордеон чек-листа у оператора; COCL: кнопка комментария в шапке аккорде |
| `css/views/toploss-accordion.css` | 164 | TOP Losses: аккордеон (как в COCL); Модалка выбора потерь |
| `css/views/editor.css` | 902 | Редактор: список линий в блоке; CL Electronic: аккордеон в «Параметры на; РЕДАКТОР: чипы типов (ChangeOver / CL_TO; РЕДАКТОР: единая панель + фильтры + табл; РЕДАКТОР: сетка фильтров; РЕДАКТОР: карточка таблицы … +7 |
| `css/components/line-picker.css` | 312 | МОДАЛКА-ВЫБОР ЛИНИИ (компактный dropdown |
| `css/views/editor-part-switch.css` | 75 | РЕДАКТОР: переключатель по части линии |
| `css/views/schedule.css` | 898 | РАСПИСАНИЕ CL: матрица (с инфо-колонками; Тулбар над матрицей: фильтр+поиск слева,; Строка матрицы: 8 инфо-колонок + 14 смен; Шапка: grid 2 ряда, 8 инфо + 14 смен; Ячейки смен; Шапка дней/смен … +8 |
| `css/views/cl-checklist.css` | 610 | ПРОВЕРКА CL: контекстная строка; ПРОВЕРКА CL: расширенная сетка с инфо-ко; БЫСТРАЯ ПРОВЕРКА: точки замера; БЫСТРАЯ ПРОВЕРКА: блок «Как проверять» |
| `css/views/schedule-time.css` | 233 | РАСПИСАНИЕ CL: чипы времени; МОДАЛКА ВРЕМЕНИ ПРОВЕРКИ |
| `css/views/standard-page.css` | 1018 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full); Шапка; Вкладки внутри; Контент; Карточки; Поля «Основная информация» … +10 |
| `css/views/eparam-page.css` | 99 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА |

## Ключи localStorage

| Ключ | Где объявлен |
| --- | --- |
| `cl_active_tab` | js/router.js:101 |
| `cl_bl_open_groups` | js/views/settings/structure.js:236 |
| `cl_blocks_v1` | STORAGE_KEYS.blocks (js/core/state.js) |
| `cl_brandWorkshops_v1` | STORAGE_KEYS.brandWorkshops (js/core/state.js) |
| `cl_brands_open_ws` | js/views/settings/brands.js:11 |
| `cl_brands_v2` | STORAGE_KEYS.brands (js/core/state.js) |
| `cl_brands_ws_autoassign_v1` | js/data/catalog.js:375 |
| `cl_cl_line` | js/views/cl-checklist/cl-checklist.js:177 |
| `cl_cl_mode` | js/views/cl-checklist/cl-checklist.js:175 |
| `cl_cl_part` | js/views/cl-checklist/cl-checklist.js:176 |
| `cl_ct_open_groups` | js/views/settings/triggers.js:95 |
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
| `cl_lb_open_blocks` | js/views/settings/line-brands.js:11 |
| `cl_lineBrands_v2` | STORAGE_KEYS.lineBrands (js/core/state.js) |
| `cl_lineMachines_v1` | STORAGE_KEYS.lineMachines (js/core/state.js) |
| `cl_lines_v2` | STORAGE_KEYS.lines (js/core/state.js) |
| `cl_lm_open_blocks` | js/views/settings/machines.js:11 |
| `cl_nodes_v2` | STORAGE_KEYS.nodes (js/core/state.js) |
| `cl_operators_v2` | STORAGE_KEYS.operators (js/core/state.js) |
| `cl_photos_broken_count` | js/views/dashboard.js:1170 |
| `cl_recent_lines` | js/views/editor/editor-core.js:12 |
| `cl_schedule_line` | js/views/schedule/schedule.js:35 |
| `cl_schedule_mode` | js/views/schedule/schedule.js:34 |
| `cl_schedule_part` | js/views/schedule/schedule.js:36 |
| `cl_schedule_weeks_v1` | STORAGE_KEYS.scheduleWeeks (js/core/state.js) |
| `cl_shifts_v2` | STORAGE_KEYS.shifts (js/core/state.js) |
| `cl_sidebar_pinned` | js/router.js:113 |
| `cl_standards_v3` | STORAGE_KEYS.standards (js/core/state.js) |
| `cl_theme` | js/app.js:110 |
| `cl_tl_open_cats` | js/views/settings/toplosses.js:11 |
| `cl_tl_open_ws` | js/views/settings/toplosses.js:279 |
| `cl_toploss_ws_split_v1` | js/data/catalog.js:290 |
| `cl_toplosses_v1` | STORAGE_KEYS.topLosses (js/core/state.js) |
| `cl_triggers_ws_v1` | js/data/catalog.js:439 |
| `cl_workshops_migration_smd_cell_named` | js/data/workshops.js:24 |
| `cl_workshops_v1` | STORAGE_KEYS.workshops (js/core/state.js) |
