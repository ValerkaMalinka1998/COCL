# Карта проекта COCL

Сгенерировано 2026-10-21 по коммиту `6b4766c Merge pull request #37 from ValerkaMalinka1998/claude/eparam-all-to-main` скриптом `.claude/skills/cocl-session-close/scripts/gen_project_map.py` — пересоздавайте после крупных правок.

JS — 53 модулей, 19997 строк, 640 функций · CSS — 35 файлов, 12115 строк.
Как искать: модуль по назначению → раздел в таблице ниже → `Grep` по имени функции в этом файле.

## JS-модули (в порядке подключения в index.html)

Все модули — обычные `<script>` с общим пространством имён. Код, выполняемый при загрузке, не может ссылаться на модули, подключённые позже — проверка: `node .claude/skills/cocl-review/scripts/check_load_order.js`.

| Модуль | Строк | Функций | Назначение |
| --- | --- | --- | --- |
| `js/router.js` | 180 | 2 | РОУТЕР — навигация между вкладками с сохранением в URL |
| `js/core/utils.js` | 90 | 15 | ЯДРО: утилиты |
| `js/core/state.js` | 156 | 0 | ЯДРО: константы и состояние |
| `js/core/dates.js` | 135 | 13 | ЯДРО: даты, недели, смены |
| `js/core/modal.js` | 134 | 4 | ЯДРО: стек модальных окон |
| `js/data/standards.js` | 386 | 24 | ДАННЫЕ: стандарты и история |
| `js/data/workshops.js` | 249 | 19 | ДАННЫЕ: структура производства |
| `js/data/catalog.js` | 477 | 40 | ДАННЫЕ: справочники |
| `js/data/schedule.js` | 179 | 10 | ДАННЫЕ: расписание CL |
| `js/data/changelog.js` | 231 | 13 | ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ СТАНДАРТОВ |
| `js/data/line-brand.js` | 100 | 7 | ТЕКУЩИЙ БРЕНД ЛИНИИ |
| `js/components/pickers.js` | 420 | 14 | КОМПОНЕНТЫ: окна выбора |
| `js/components/validation.js` | 190 | 7 | КОМПОНЕНТЫ: валидация нового стандарта / E-Param |
| `js/components/line-picker.js` | 368 | 14 | КОМПОНЕНТЫ: выбор линии |
| `js/components/photo-slider.js` | 105 | 3 | КОМПОНЕНТЫ: слайдер фото стандарта |
| `js/components/standard-view.js` | 297 | 14 | КОМПОНЕНТЫ: окно просмотра стандарта |
| `js/components/quick-add-machine.js` | 81 | 2 | КОМПОНЕНТЫ: быстрое добавление машины к линии |
| `js/components/cil-table.js` | 189 | 10 | КОМПОНЕНТЫ: таблица недели в стиле CIL |
| `js/components/mj-notice.js` | 72 | 2 | КОМПОНЕНТЫ: уведомление «Сделайте запись в Machine Journal» |
| `js/components/line-brand-picker.js` | 54 | 2 | КОМПОНЕНТЫ: «Бренд на линии» — плашка и окно выбора |
| `js/io/excel-common.js` | 52 | 0 | EXCEL: общие функции шаблонов |
| `js/io/standards-io.js` | 823 | 3 | EXCEL: импорт и экспорт стандартов |
| `js/views/brand-schedule.js` | 396 | 7 | ВКЛАДКА CL: расписание брендов |
| `js/views/cocl/cocl.js` | 981 | 33 | ВКЛАДКА «Проверка COCL» |
| `js/views/cocl/cocl-save.js` | 177 | 1 | ВКЛАДКА «Проверка COCL»: сохранение |
| `js/views/cl-checklist/cl-checklist.js` | 928 | 25 | ВКЛАДКА «Чек-лист CL» |
| `js/views/cl-checklist/quick-check.js` | 477 | 13 | ВКЛАДКА «Чек-лист CL»: быстрая проверка |
| `js/views/toploss/toploss.js` | 520 | 17 | ВКЛАДКА «TOP Losses»: разбор потерь линии |
| `js/views/toploss/toploss-check.js` | 382 | 8 | TOP LOSSES: проверка, сохранение, итог |
| `js/views/history/history-data.js` | 294 | 27 | ИСТОРИЯ: данные |
| `js/views/history/history.js` | 525 | 24 | ВКЛАДКА «История»: лента проверок и журнал отклонений |
| `js/views/history/history-record.js` | 314 | 10 | ИСТОРИЯ: страница проверки (вместо окна «Просмотр проверки») |
| `js/views/history/history-standard.js` | 206 | 5 | ИСТОРИЯ: история одного стандарта / E-Param |
| `js/views/history/history-export.js` | 728 | 9 | ИСТОРИЯ: экспорт CSV / XLSX |
| `js/views/dashboard.js` | 630 | 21 | ВКЛАДКА «Дашборд» |
| `js/views/editor/editor-core.js` | 777 | 16 | ВКЛАДКА «Стандарты CL»: каркас |
| `js/views/editor/editor-mech.js` | 321 | 12 | СТАНДАРТЫ CL: таблица механических стандартов |
| `js/views/editor/editor-elec.js` | 468 | 10 | СТАНДАРТЫ CL: таблица электронных параметров + Excel |
| `js/views/editor/eparam-page.js` | 660 | 14 | СТРАНИЦА электронного параметра |
| `js/views/editor/changelog-view.js` | 508 | 19 | СТАНДАРТЫ CL: ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ |
| `js/views/standard-page/standard-page.js` | 732 | 18 | СТРАНИЦА стандарта: открытие, поля, точки |
| `js/views/standard-page/standard-page-extra.js` | 629 | 9 | СТРАНИЦА стандарта: фото, связи, доп. информация, сохранение |
| `js/views/schedule/schedule.js` | 1142 | 38 | ВКЛАДКА «Расписание CL» |
| `js/views/schedule/schedule-add.js` | 446 | 8 | РАСПИСАНИЕ CL: добавление стандартов |
| `js/views/settings/settings-shell.js` | 154 | 9 | НАСТРОЙКИ: каркас вкладки |
| `js/views/settings/structure-tree.js` | 659 | 18 | НАСТРОЙКИ: структура производства — дерево и карточка линии |
| `js/views/settings/shifts.js` | 218 | 8 | НАСТРОЙКИ: график смен |
| `js/views/settings/toplosses.js` | 475 | 9 | НАСТРОЙКИ: Top Losses |
| `js/views/settings/brands.js` | 353 | 7 | НАСТРОЙКИ: общий список брендов |
| `js/views/settings/operators.js` | 208 | 7 | НАСТРОЙКИ: операторы |
| `js/views/settings/triggers.js` | 184 | 6 | НАСТРОЙКИ: триггеры Change Over |
| `js/views/settings/photos.js` | 343 | 7 | НАСТРОЙКИ: хранилище и проверка фото |
| `js/app.js` | 194 | 7 | ЗАПУСК ПРИЛОЖЕНИЯ |

## JS — разделы и функции

| Файл:строка | Раздел | Функции |
| --- | --- | --- |
| js/router.js:1 | (начало модуля) | `switchTab`, `initRouter` |
| js/core/utils.js:8 | УТИЛИТЫ | `cmtIcon`, `cmtLine`, `$`, `$$`, `showToast`, `nowStr`, `fmtDate`, `uid`, `escapeHtml`, `getPhotoPath`, `escapeAttr` |
| js/core/utils.js:76 | ДОСТУП К ДАННЫМ | `load`, `save`, `getOperators`, `setOperators` |
| js/core/dates.js:1 | (начало модуля) | `todayISO`, `addDaysISO`, `getWeekDays`, `getClWeekDays`, `getWeekLabel`, `fmtISODate`, `daysSinceStart`, `getDayShiftForDate`, `getNightShiftForDate`, `getShiftsForDate`, `getCurrentShiftPeriod`, `getShiftForDate`, `fmtShortDate` |
| js/core/modal.js:8 | СТЕК МОДАЛЬНЫХ ОКОН | `openModal`, `closeModal`, `bindModalBackdropClose`, `pluralizeStandards` |
| js/data/standards.js:8 | ФАБРИКА СТАНДАРТА — единая структура | `createEmptyStandard`, `normalizeAppliesTo`, `normalizeMeasurements`, `parseNorm`, `classifyNormValue`, `normWork`, `normTypeError` |
| js/data/standards.js:208 | ТИПЫ КОНТРОЛЯ — миграция на 3 канонических типа | `hasToleranceInMeasurements`, `migrateControlType`, `normalizeStandard`, `getStandards`, `setStandards`, `getHistory`, `setHistory` |
| js/data/standards.js:292 | ВАЛИДАЦИЯ НОВОГО СТАНДАРТА / E-PARAM | `valShiftIndex`, `valShiftFromIndex`, `makeValidation`, `validationShiftCount`, `normalizeValidation`, `isOnValidation`, `isValidationShift`, `isValidationDay`, `validationStatus`, `validationShiftsLeft` |
| js/data/workshops.js:8 | СТРУКТУРА ПРОИЗВОДСТВА — доступ к данным | `migrateToWorkshopsStructure`, `getWorkshops`, `setWorkshops`, `getWorkshop`, `getWorkshopName`, `workshopOptionsHtml`, `getArea`, `getBlock`, `getBlockForLine`, `getWorkshopIdForLine`, `getAllLinesWithContext` |
| js/data/workshops.js:161 | ОБРАТНАЯ СОВМЕСТИМОСТЬ | `getLines`, `setLines`, `getBlocks`, `setBlocks`, `getAllAreas`, `getLineMachines` |
| js/data/workshops.js:238 | Часть линии (Maker / Packer) есть только у линий SMD. | `lineHasParts`, `linePartFilter` |
| js/data/catalog.js:8 | TOP LOSSES — доступ к данным | `getTopLosses`, `getElectronicParams`, `setElectronicParams`, `makeElectronicParamId`, `normalizeElectronicParam`, `normalizeElectronicFrequency`, `getElectronicParamsForLine`, `getElectronicParamsForMachine`, `getElectronicBrandsForLine`, `getElectronicBrandScheduleForLine`, `getElectronicBrandForDate`, `setElectronicBrandForDate`, `setElectronicBrandScheduleBulk`, `setTopLosses` … +26 |
| js/data/schedule.js:8 | РАСПИСАНИЕ CL — ПОНЕДЕЛЬНЫЕ ПРАВКИ (оверрайды) | `getSchWeekStart`, `getScheduleWeeks`, `setScheduleWeeks`, `getScheduleWeekOverride`, `setScheduleWeekOverride`, `hasScheduleWeekOverride` |
| js/data/schedule.js:76 | РАСПИСАНИЕ CL — ВЕРСИИ ШАБЛОНА | `getRowTemplateForWeek`, `getRowForWeek`, `setRowTemplateFrom`, `isShiftPast` |
| js/data/changelog.js:1 | (начало модуля) | `getChangeLog`, `setChangeLog`, `changeLogSnapshot`, `addChangeLogEntry`, `updateChangeLogEntry`, `removeChangeLogEntry`, `getChangeLogForLine`, `getChangeLogForRef`, `clJson`, `clBrandsDiff`, `clDetailText`, `describeRowChange`, `logRowChange` |
| js/data/line-brand.js:1 | (начало модуля) | `getLineBrandEvents`, `setLineBrandEvents`, `addLineBrandEvent`, `getLineBrandNow`, `lineBrandSourceText`, `pickBrandValues`, `brandPickLabel` |
| js/components/pickers.js:18 | КОММЕНТАРИЙ К ДЕАКТИВАЦИИ | `openDeactivationCommentModal`, `closeDeactivationCommentModal` |
| js/components/pickers.js:124 | TOP LOSSES стандарта — выбор через окно | `openTopLossPickerFor` |
| js/components/pickers.js:143 | Модалка выбора потерь | `openTopLossPickerModal`, `closeTopLossPickerModal`, `getTopLossPickerWorkshop`, `renderTopLossPickerList`, `updateTopLossPickerCounter`, `applyTopLossPicker` |
| js/components/pickers.js:298 | ВЫБОР ТРИГГЕРОВ CHANGE OVER — общая модалка | `openTriggerPickerModal`, `renderTriggerPickerList`, `updateTriggerPickerCounter`, `closeTriggerPickerModal`, `renderTriggerChipsEditable` |
| js/components/validation.js:1 | (начало модуля) | `valShiftLabel`, `valPointLabel`, `valChipHtml`, `valEditBlockHtml`, `valReadEdit`, `valCheckStats`, `valBannerHtml` |
| js/components/line-picker.js:8 | ВЫБОР ЛИНИИ — компактный dropdown (#linePickerModal) | `resetLinePickerState`, `openLinePickerModal`, `closeLinePickerModal`, `renderLinePickerModal`, `renderLinePickerStart`, `renderLinePickerWorkshopView`, `renderLinePickerRecent`, `renderLinePickerBreadcrumbs`, `renderLinePickerAreaTiles`, `renderLinePickerBlockTiles`, `renderLinePickerRowsForArea`, `renderLinePickerRowsForBlock`, `renderLinePickerSearch`, `bindLinePickerEvents` |
| js/components/photo-slider.js:1 | (начало модуля) | `photoSliderHtml`, `photoSliderGo`, `bindPhotoSlider` |
| js/components/standard-view.js:8 | ПРОСМОТР СТАНДАРТА — полноценная модалка | `controlTypeLabel`, `formatDateTime`, `openStandardView`, `renderStandardViewHeaderChips`, `svmText`, `renderStandardViewContent`, `closeStandardView` |
| js/components/standard-view.js:181 | ЛАЙТБОКС — просмотр фото | `openLightbox`, `updateLightbox`, `lightboxPrev`, `lightboxNext`, `closeLightbox`, `lightboxKeyHandler`, `closeCommentModal` |
| js/components/quick-add-machine.js:8 | БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра) | `openQuickAddMachineModal`, `closeQuickAddMachineModal` |
| js/components/cil-table.js:9 | ИКОНКИ (Feather) | `cilZoneMap`, `cilSortRows`, `cilDateByDayIdx`, `cilTimeChips`, `cilWorkTag` |
| js/components/cil-table.js:71 | НОРМА / ТОЧКИ | `cilPointsWord`, `cilNorm` |
| js/components/cil-table.js:149 | ШАПКА: дни и смены с буквами смен | `cilHeadHtml`, `cilShiftProgress`, `cilTdClass` |
| js/components/mj-notice.js:1 | (начало модуля) | `showMachineJournalNotice`, `closeMachineJournalNotice` |
| js/components/line-brand-picker.js:1 | (начало модуля) | `lineBrandBarHtml`, `openLineBrandPicker` |
| js/io/standards-io.js:278 | ПАРСЕР EXCEL — ШАБЛОН OPL (v3: два листа, точки отдельно) | `parseStandardsExcelV3` |
| js/io/standards-io.js:581 | РЕДАКТОР: скачать шаблон OPL для линии | `editorDownloadTemplate` |
| js/io/standards-io.js:699 | РЕДАКТОР: экспорт стандартов линии в XLSX | `editorExportLine` |
| js/views/brand-schedule.js:8 | CL ELECTRONIC — расписание брендов | `getElectronicBrandSchedule`, `setElectronicBrandSchedule` |
| js/views/brand-schedule.js:29 | CL ELECTRONIC — модалка «Расписание брендов» | `openElectronicBrandSchedule`, `closeElectronicBrandSchedule`, `fillBrandSelectOptions` |
| js/views/brand-schedule.js:108 | Режим «По дням» — рендер строк | `renderEbsDailyRows` |
| js/views/brand-schedule.js:167 | Превью итогового расписания | `renderEbsPreview` |
| js/views/cocl/cocl.js:8 | COCL: экран резюме после сохранения проверки | `renderCoclSummary` |
| js/views/cocl/cocl.js:147 | ВКЛАДКА ПРОВЕРКА | `fillLinesForOperator`, `setCoclLine`, `clearCoclLine`, `getCurrentUser`, `getCoclBrandOfDay`, `fillBrandsForLine`, `updateBrandToOptions`, `renderCoclBrandTiles`, `closeCoclBrandPops`, `renderCoclLineContext`, `renderCoclPartStep`, `updateCoclStepStates`, `openCoclTab`, `onTransitionTypeChange` … +2 |
| js/views/cocl/cocl.js:504 | Показ стандарта в Change Over — логика «отличий точек» | `getEffectiveBrandBlock`, `brandBlocksDiffer`, `standardMatchesTriggers`, `getCoclRelevant`, `updateChecklist`, `renderChecklist` |
| js/views/cocl/cocl.js:709 | COCL: строки чек-листа — обработчики | `bindCoclAccordionEvents`, `updateCoclItemStatus`, `updateCoclItemStatusFromPoints`, `updateProgress`, `updateCommentUrgency` |
| js/views/cocl/cocl.js:911 | МОДАЛЬНОЕ ОКНО КОММЕНТАРИЯ | `openCommentModal` |
| js/views/cocl/cocl.js:928 | COCL: Сворачивание верхней части и показ чек-листа | `buildChecklistView`, `updateChecklistForCheck`, `setCoclCheckingUi`, `editChecklistConditions` |
| js/views/cocl/cocl-save.js:7 | СОХРАНЕНИЕ ПРОВЕРКИ | `resetCheckForm` |
| js/views/cl-checklist/cl-checklist.js:8 | CL ELECTRONIC — попадает ли параметр в конкретную дату/смену | `isElectronicParamDue` |
| js/views/cl-checklist/cl-checklist.js:170 | ПРОВЕРКА CL — логика | `openClCheckTab`, `updateClLinePill`, `updateClPartSwitchVisibility`, `updateClCheckButtons`, `updateClContext`, `openClBrandOverrideDialog`, `updateClPanelCount`, `renderClMatrix`, `updateClPartCounts`, `cilIsoWeek`, `clHistoryIndex`, `clRowCells`, `bindClWeekNav`, `renderClRow` … +4 |
| js/views/cl-checklist/cl-checklist.js:674 | КАРТОЧКА ЯЧЕЙКИ: итог прошлой проверки | `closeClPeek`, `showClPeek`, `quickSetClCell`, `startClCheck`, `stopClCheck`, `saveClDraftToHistory` |
| js/views/cl-checklist/quick-check.js:8 | БЫСТРАЯ ПРОВЕРКА — состояние и открытие | `qcNum`, `getQcBrandPick`, `getQcFields`, `getQcQueue`, `getQcNext`, `getQcPrevious`, `openClCheckModal`, `updateQcResult` |
| js/views/cl-checklist/quick-check.js:272 | БЫСТРАЯ ПРОВЕРКА — закрытие | `closeQuickCheckModal` |
| js/views/cl-checklist/quick-check.js:283 | БЫСТРАЯ ПРОВЕРКА — сохранение | `saveQuickCheck` |
| js/views/cl-checklist/quick-check.js:388 | БЫСТРАЯ ПРОВЕРКА — хелперы | `getRowMeasurementBlock`, `openCommentModalElec`, `openElecBrandOverrideDialog` |
| js/views/toploss/toploss.js:23 | ИКОНКИ КАТЕГОРИЙ (Feather-стиль) | `tlCatKind` |
| js/views/toploss/toploss.js:36 | ДАННЫЕ | `tlCollectRows`, `tlRecentShifts`, `tlWeekStartOf`, `tlHistoryIndex`, `tlRowShiftStatuses`, `tlLossStats`, `tlLastCheck` |
| js/views/toploss/toploss.js:126 | ЛИНИЯ | `fillTopLossTab`, `setTopLossLine` |
| js/views/toploss/toploss.js:150 | РЕНДЕР ЭКРАНА РАЗБОРА | `renderTopLossCategories` |
| js/views/toploss/toploss.js:201 | ВЫБОР ЛИНИИ НА ЭКРАНЕ (линия ещё не выбрана) | `tlLinePickStats`, `tlPickTile`, `renderTopLossLinePick`, `renderTopLossSide`, `renderTopLossDiag` |
| js/views/toploss/toploss.js:451 | ОБРАБОТЧИКИ | `backToTopLossSelect` |
| js/views/toploss/toploss-check.js:1 | (начало модуля) | `tlCheckPoints`, `tlCheckStatusFromValues` |
| js/views/toploss/toploss-check.js:52 | ОТКРЫТИЕ ПРОВЕРКИ | `buildTopLossChecklist`, `renderTopLossChecklist`, `updateTlCheckProgress`, `tlCheckRefreshItem` |
| js/views/toploss/toploss-check.js:185 | СОХРАНЕНИЕ | `saveTopLossCheck` |
| js/views/toploss/toploss-check.js:259 | ИТОГ ПРОВЕРКИ | `renderTopLossSummary` |
| js/views/history/history-data.js:1 | (начало модуля) | `histKind`, `histKindLabel`, `histIcon`, `histShift`, `histOrderKey`, `getHistoryModeText`, `formatClShift`, `histShiftLabel`, `histTime`, `histDayName`, `histDayTitle`, `histIsElecItem`, `histItemNorms`, `histItemValues` … +13 |
| js/views/history/history.js:1 | (начало модуля) | `loadHistFilters`, `saveHistFilters` |
| js/views/history/history.js:31 | ФИЛЬТРЫ | `fillHistoryFilters`, `fillHistMachineFilter`, `histPeriodMatch`, `histSearchMatch`, `getFilteredHistory` |
| js/views/history/history.js:120 | РЕНДЕР | `histShowView`, `renderHistory`, `renderHistKpis`, `pluralRu`, `renderHistCoverage`, `histIsoWeek`, `histCoverageHtml`, `histRecordContext`, `histRecordSub`, `histResultHtml`, `histStatusTag`, `renderHistFeed`, `histDeviationEntries`, `histTop` … +1 |
| js/views/history/history.js:460 | ОБРАБОТЧИКИ | `histFilterChanged`, `viewRecord` |
| js/views/history/history-record.js:1 | (начало модуля) | `histOpenSub`, `histBack`, `openHistoryRecord`, `openHistoryShift`, `histPageData`, `histNeighbors`, `histNavLabel`, `renderHistRecordPage`, `histItemHtml`, `histMjText` |
| js/views/history/history-standard.js:1 | (начало модуля) | `openStandardHistory`, `histStdBack`, `histStdData`, `renderStandardHistory`, `histStdChart` |
| js/views/history/history-export.js:7 | ЭКСПОРТ: детали и CSV | `buildDetailsText`, `buildDetailsTextForCsv`, `exportToCsv` |
| js/views/history/history-export.js:94 | ЭКСПОРТ В XLSX (ExcelJS) | `exportToXlsx`, `buildSheetChecks`, `buildSheetAnalytics` |
| js/views/history/history-export.js:472 | XLSX: лист «Потери» — аналитика по TOP Losses | `buildSheetLosses` |
| js/views/history/history-export.js:589 | XLSX: лист «CL» — аналитика по Чек-листу CL (мех + электро) | `buildSheetCL` |
| js/views/history/history-export.js:707 | СКАЧИВАНИЕ ФАЙЛОВ | `downloadBlob` |
| js/views/dashboard.js:28 | ДАННЫЕ | `dashSlots`, `dashSlotKey`, `dashFirstDate`, `dashLines`, `dashClMetrics`, `dashRecords`, `dashMargin`, `dashSummary`, `dashFailStreak`, `dashAttention`, `dashWeeks` |
| js/views/dashboard.js:272 | РЕНДЕР: ГЛАВНЫЙ ЭКРАН | `renderDashboard`, `renderDashboardHead`, `dashDelta`, `dashKpisHtml`, `dashLineColor`, `dashMapHtml`, `dashAttentionHtml`, `dashTrendHtml` |
| js/views/dashboard.js:426 | ПАСПОРТ ЛИНИИ | `openDashboardLine`, `renderDashboardLine` |
| js/views/editor/editor-core.js:8 | РЕДАКТОР: недавние линии и режим просмотра | `getRecentLines`, `addRecentLine` |
| js/views/editor/editor-core.js:117 | Выбор линии | `selectLine` |
| js/views/editor/editor-core.js:168 | Обновление UI: чип + крошки + счётчики | `updateEditorLineContext`, `buildEditorCrumbs` |
| js/views/editor/editor-core.js:246 | Счётчики Maker / Packer | `updatePartCounters` |
| js/views/editor/editor-core.js:289 | Переключатель режима внутри панели | `switchEditorModeInline` |
| js/views/editor/editor-core.js:323 | Сброс линии | `clearEditorLine` |
| js/views/editor/editor-core.js:345 | Обработчики | `bindPartSwitchHandlers` |
| js/views/editor/editor-core.js:432 | РЕДАКТОР: обновление сброса фильтров | `resetMechFilters`, `resetElecFilters` |
| js/views/editor/editor-core.js:546 | РЕДАКТОР: заполнение фильтров | `fillEditorFilters`, `renderEditorMachineChips` |
| js/views/editor/editor-core.js:620 | РЕДАКТОР: переключение активности стандарта | `toggleStandardActive` |
| js/views/editor/editor-core.js:657 | РЕДАКТОР: копирование стандарта | `copyStandardNew` |
| js/views/editor/editor-core.js:688 | РЕДАКТОР: удаление стандарта | `deleteStandardNew` |
| js/views/editor/editor-mech.js:7 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация | `getFilteredMechStandards`, `editorAppliesMatch`, `editorRowSchedule` |
| js/views/editor/editor-mech.js:59 | СТАНДАРТЫ CL: общие куски строки таблицы | `etAppliesHtml`, `etTypeNormHtml`, `etScheduleHtml`, `etStatusHtml`, `etGroupRow`, `etPluralStd` |
| js/views/editor/editor-mech.js:116 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы | `refreshEditorMechTable`, `updateMechSelectionUI`, `renderEditorMechPagination` |
| js/views/editor/editor-elec.js:7 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация | `getFilteredElecParams`, `etPluralParam` |
| js/views/editor/editor-elec.js:48 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы | `refreshEditorElecTable`, `updateElecSelectionUI`, `renderEditorElecPagination` |
| js/views/editor/editor-elec.js:249 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: экспорт / импорт / шаблон | `serializeValuesByBrand`, `parseValuesByBrand`, `editorElecDownloadTemplate`, `editorElecExport`, `parseElectronicParamsExcel` |
| js/views/editor/eparam-page.js:9 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА | `getEparamNormRange`, `getEparamNormLabel`, `openEparamPage`, `closeEparamPage`, `renderEparamPage`, `applyEparamMode`, `renderEparamHistory`, `renderEparamStubs`, `switchEparamTab`, `renderEparamMainFields`, `renderEparamNorm`, `syncEparamRowsFromDom`, `renderEparamRelated`, `renderEparamExtra` |
| js/views/editor/changelog-view.js:1 | (начало модуля) | `clogFmtDate`, `clogMachineNode`, `clogNumberText`, `clogActionChip`, `clogRefExists`, `getClogPart`, `getFilteredChangeLog`, `refreshChangeLogView`, `clogPluralEntry`, `changeHistoryHtml`, `askChangeReason`, `openChangeLogEntry`, `openNewChangeLogEntry`, `clogRefOptions` … +5 |
| js/views/standard-page/standard-page.js:8 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full) — открытие и заполнение | `openStandardFullView` |
| js/views/standard-page/standard-page.js:56 | СОЗДАНИЕ МЕХАНИЧЕСКОГО СТАНДАРТА | `openStandardCreatePage`, `closeStandardFullView`, `renderStandardFullView`, `renderSvFullCrumbs` |
| js/views/standard-page/standard-page.js:241 | Основная информация — поля | `renderSvMainFields`, `svFieldRow`, `formatSvDuration` |
| js/views/standard-page/standard-page.js:377 | Точки контроля и описание — блоки | `renderSvContentBlocks`, `buildSvContentBlocksHtml`, `svContentBlockEditable` |
| js/views/standard-page/standard-page.js:476 | Контроль правильности — таблица брендов × точек | `renderSvControlSection`, `renderReadonlyBrandsTable`, `renderSvBrandBlocksView` |
| js/views/standard-page/standard-page.js:557 | Таблица брендов × точек — рендер в новом экране | `renderSvBrandsTable`, `getSvTableState`, `renderSvBrandsTableFromState`, `bindSvControlEvents` |
| js/views/standard-page/standard-page-extra.js:8 | Фото | `renderSvFullPhotos` |
| js/views/standard-page/standard-page-extra.js:76 | Связанные объекты | `renderSvFullRelated` |
| js/views/standard-page/standard-page-extra.js:113 | Дополнительная информация (Применять к, Триггеры, Top Losses | `renderSvFullExtra` |
| js/views/standard-page/standard-page-extra.js:312 | Заглушки для таблиц вкладок | `renderSvAckTable`, `renderSvHistoryTable`, `refreshSvHistory`, `renderSvCommentsTable` |
| js/views/standard-page/standard-page-extra.js:363 | Переключение вкладок внутри просмотра | `switchSvFullTab` |
| js/views/standard-page/standard-page-extra.js:614 | ПОДСВЕТКА ЗНАЧЕНИЙ, НЕ ПОДХОДЯЩИХ ТИПУ КОНТРОЛЯ | `markSvPointTypes` |
| js/views/schedule/schedule.js:8 | РАСПИСАНИЕ CL — вкладка аналитика | `openScheduleTab`, `updateSchLinePill`, `updateSchPanelCount`, `isSchRowMember`, `isSchRowValidation`, `isSchRowShown`, `getFilteredScheduleRows`, `updateSchMatrixCounters`, `fillSchMachineFilter`, `renderScheduleMatrix` |
| js/views/schedule/schedule.js:433 | РАСПИСАНИЕ CL — время проверки (timeWindows) | `getTimeWindowShift`, `twMinutesFromShiftStart`, `twAddMinutes`, `twNormalizeTime`, `openTimeWindowsModal`, `closeTimeWindowsModal`, `renderTimeWindowsList`, `updateTwCustomPreview`, `addTimeWindow`, `saveTimeWindows`, `getSchRowFreq`, `getClRowFreq`, `getCheckedStandardIdsForWeek`, `ensureSchDraft` … +14 |
| js/views/schedule/schedule-add.js:7 | РАСПИСАНИЕ CL — модалка добавления стандартов | `openScheduleAddStandardsModal`, `closeScheduleAddStandardsModal`, `renderSchAddList`, `toggleSchAddItem`, `updateSchAddCounter`, `updateSchAddCheckAllState`, `confirmScheduleAddStandards`, `selectLine` |
| js/views/settings/settings-shell.js:23 | ОТРИСОВКА ВСЕЙ ВКЛАДКИ | `renderSettings`, `getSavedSettingsPanel`, `showSettingsPanel`, `updateSettingsNavCounts` |
| js/views/settings/settings-shell.js:78 | ОБЩИЕ ПОМОЩНИКИ РАЗДЕЛОВ | `settingsChipsHtml`, `settingsSearchHtml`, `settingsHighlight`, `startInlineEdit`, `settingsWorkshopChipItems` |
| js/views/settings/structure-tree.js:20 | ДАННЫЕ | `stFindOwner`, `stDetachLine`, `stLineUsage`, `stOrphanLines`, `stAddLine`, `stMoveLine`, `stDeleteLine`, `stAddBlock`, `stRenameBlock`, `stDeleteBlock`, `stAddMachine`, `stRenameMachine`, `removeMachineFromLine`, `stToggleBrand` … +2 |
| js/views/settings/structure-tree.js:275 | ДЕРЕВО | `renderStructureSettings` |
| js/views/settings/structure-tree.js:405 | КАРТОЧКА ЛИНИИ | `renderStructureLineCard` |
| js/views/settings/shifts.js:7 | ГРАФИК СМЕН — конфигурация (cl_electronic_shiftcfg_v1) | `sanitizeCycleArray`, `getElectronicShiftConfig`, `setElectronicShiftConfig` |
| js/views/settings/shifts.js:69 | НАСТРОЙКИ: раздел «Смены» — редактор цикла смен | `shfIsDirty`, `shfBrigadesFor`, `renderElectronicShiftSettings`, `renderElectronicShiftPreview`, `pluralizeLines` |
| js/views/settings/toplosses.js:7 | TOP LOSSES — категории по цехам, правка в строке | `pluralizeLosses`, `tlCategoryKind`, `renderTopLossesSettings`, `tlSaveItem`, `deleteTopLossItem`, `deleteOperator` |
| js/views/settings/toplosses.js:186 | TOP LOSSES — шаблон и импорт Excel | `parseTopLossesExcel`, `parseOperatorsExcel`, `showImportReport` |
| js/views/settings/brands.js:7 | ОБЩИЙ СПИСОК БРЕНДОВ — справочник с фильтром по цеху | `pluralizeBrandsShort`, `getLinesForBrand`, `renderBrandsSettings`, `addBrandInline`, `renameBrand`, `deleteBrand` |
| js/views/settings/brands.js:224 | ИМПОРТ/ЭКСПОРТ БРЕНДОВ | `parseBrandsExcel` |
| js/views/settings/operators.js:7 | ОПЕРАТОРЫ — строки + inline + пагинация | `renderOperatorsSettings`, `highlightOperatorName`, `renderOperatorsPagination`, `changeOperatorsPage`, `sortOperatorsRus`, `openAddOperatorModal`, `closeAddOperatorModal` |
| js/views/settings/triggers.js:7 | НАСТРОЙКИ: пользовательские триггеры Change Over | `renderCustomTriggersSettings`, `addCustomTriggerInline`, `updateCustomTrigger`, `deleteCustomTrigger`, `getAvailableLines`, `getBrandsForLine` |
| js/views/settings/photos.js:7 | КАРТОЧКА «ХРАНИЛИЩЕ ФОТО» | `renderPhotoStorageSettings` |
| js/views/settings/photos.js:28 | ПРОВЕРКА ФОТОГРАФИЙ НА БИТЫЕ ССЫЛКИ | `checkPhotoExists`, `runPhotosCheck`, `renderPhotosCheckResult`, `buildPhotosCheckReport`, `closePhotosCheckModal` |
| js/views/settings/photos.js:232 | ХРАНИЛИЩЕ ФОТО — обработчики | `fallbackCopy` |
| js/app.js:8 | ШАПКА: ЧАСЫ, СМЕНА И «КРУГ СМЕНЫ» | `tickClock`, `updateHeaderShift` |
| js/app.js:61 | СЧЁТЧИКИ В SIDEBAR | `updateNavHistoryCounter`, `updateNavSettingsBadge`, `updateNavCounters` |
| js/app.js:109 | ИНИЦИАЛИЗАЦИЯ | `init` |
| js/app.js:153 | ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (light / dark) | `applyTheme` |

## CSS (в порядке каскада)

Точка входа `style.css`: @import в этом порядке + anti-flash + печать. Переменные темы — `css/base.css`. Порядок @import менять нельзя — от него зависит каскад.

| Файл | Строк | Блоки |
| --- | --- | --- |
| `css/base.css` | 198 | BASE — переменные, сброс, типографика, ф; ТЕМА: Дневная (light) — по умолчанию; ТЕМА: Ночная (dark) — «Pit Wall»; Сброс; Формы; Скроллбар |
| `css/layout.css` | 458 | LAYOUT — header, sidebar, main, tabs, fo; Header; Layout; Вкладки; Sidebar; Кнопка закрепления sidebar … +7 |
| `css/components/ui-base.css` | 831 | Cards; Layout; Checkbox chips; Кнопки; Checklist items; Ответ в чек-листе: всё в одну строку … +15 |
| `css/views/cocl-panel.css` | 523 | COCL: две панели — условия слева, чек-ли; Условия; Чек-лист |
| `css/components/forms.css` | 184 | Компактные чекбоксы типов (Редактор); Автокомплит; Импорт: отчёт по ошибкам; Компактный список с поиском |
| `css/components/points.css` | 119 | Панель кнопок внизу карточки; Input error; Форма стандарта; Строка «селект + кнопка»; Опция «не в списке» в выпадающем списке ; Точки замера — динамический список … +1 |
| `css/views/settings-photo-card.css` | 78 | Карточка «Хранилище фото» |
| `css/views/dashboard.css` | 107 | ВКЛАДКА «ДАШБОРД»: карта производства и ; Показатели; Карта: цеха → участки → линии; Требует внимания; Строки списков; График недель … +1 |
| `css/components/photos.css` | 353 | Результат проверки фото; Фотографии в форме стандарта; Строка добавления фото (textarea + кнопк; МОДАЛКА ПРОСМОТРА СТАНДАРТА; ЛАЙТБОКС; Лайтбокс: счётчик фото |
| `css/components/theme-transition.css` | 17 |  |
| `css/views/editor-table.css` | 207 | Блоки в редакторе — плитки; Хлебные крошки; Пагинация; ТАБЛИЦА СТАНДАРТОВ; Кнопки-иконки (векторные SVG); Кнопки «иконка + текст» |
| `css/views/toploss.css` | 930 | TOP LOSSES — вкладка (экран выбора); TOP LOSSES — экран резюме (Этап 4.2); ИСТОРИЯ: режимы (COCL / TOP Losses); TOP LOSSES: новое резюме (визуальное); TOP LOSSES: статус «Не проверено»; TOP LOSSES: подсказка про Journal Machin … +8 |
| `css/views/cl-electronic.css` | 1034 | CL ELECTRONIC: дерево в редакторе; CL ELECTRONIC: расписание брендов; CL ELECTRONIC: вкладка оператора; CL ELECTRONIC: тулбар над матрицей недел; CL ELECTRONIC: матрица недели; CL Electronic: строка ответа и статус … +4 |
| `css/views/settings-brands-operators.css` | 104 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам; ОПЕРАТОРЫ — строки + inline + пагинация; Подсветка совпадений поиска |
| `css/components/points-table.css` | 280 | Точки замера: таблица по брендам; Модалка просмотра стандарта: блоки бренд |
| `css/views/cocl-accordion.css` | 249 | COCL: строки чек-листа (группы по машина |
| `css/views/toploss-accordion.css` | 93 | Модалка выбора потерь |
| `css/views/editor.css` | 778 | Редактор: список линий в блоке; CL Electronic: аккордеон в «Параметры на; РЕДАКТОР: чипы типов (ChangeOver / CL_TO; РЕДАКТОР: единая панель + фильтры + табл; РЕДАКТОР: карточка таблицы; РЕДАКТОР: таблица стандартов … +7 |
| `css/components/line-picker.css` | 312 | МОДАЛКА-ВЫБОР ЛИНИИ (компактный dropdown |
| `css/views/editor-part-switch.css` | 75 | РЕДАКТОР: переключатель по части линии |
| `css/views/schedule.css` | 462 | РАСПИСАНИЕ CL: матрица (с инфо-колонками; Тулбар над матрицей: фильтр+поиск слева,; Пустое состояние; Панель массовых операций; Адаптив; РАСПИСАНИЕ CL: модалка добавления станда … +1 |
| `css/views/cl-checklist.css` | 59 | ПРОВЕРКА CL: контекстная строка |
| `css/views/schedule-time.css` | 334 | МОДАЛКА ВРЕМЕНИ ПРОВЕРКИ; Шкала суток 09:00 → 09:00; Смены с предустановками; Своё время; Выбранные окна |
| `css/views/standard-page.css` | 986 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full); Шапка; Вкладки внутри; Контент; Карточки; Поля «Основная информация» … +10 |
| `css/views/eparam-page.css` | 115 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА |
| `css/views/changelog.css` | 133 | СТАНДАРТЫ CL: ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ |
| `css/components/line-brand.css` | 73 | БРЕНД НА ЛИНИИ (Чек-лист CL, Расписание  |
| `css/views/settings.css` | 895 | НАСТРОЙКИ: каркас, меню разделов, справо; СТРУКТУРА: дерево + карточка линии; TOP LOSSES: категории цеха карточками; Адаптив; СТРУКТУРА: перенос линии; БРЕНДЫ: сетка плиток … +1 |
| `css/views/history.css` | 331 | ВКЛАДКА «ИСТОРИЯ»: лента, покрытие смен,; Шапка: заголовок, режим, период, Excel; KPI; Фильтры; Покрытие смен; Лента проверок … +6 |
| `css/components/cil-table.css` | 441 | ТАБЛИЦА НЕДЕЛИ В СТИЛЕ CIL; Чек-лист CL и Расписание CL |
| `css/components/photo-slider.css` | 177 | СЛАЙДЕР ФОТО СТАНДАРТА |
| `css/components/standard-view.css` | 320 | ОКНО ПРОСМОТРА СТАНДАРТА (#standardViewM |
| `css/views/quick-check.css` | 446 | БЫСТРАЯ ПРОВЕРКА (#quickCheckModal) — ме |
| `css/components/validation.css` | 194 | ВАЛИДАЦИЯ НОВОГО СТАНДАРТА / E-PARAM |
| `css/brand.css` | 219 | БРЕНД BFT — Building the Future of Tobac; Шапка; Логотип; Смена, время и «круг смены»; Кнопка темы — шлем; Боковое меню … +3 |

## Ключи localStorage

| Ключ | Где объявлен |
| --- | --- |
| `cl_active_tab` | js/router.js:111 |
| `cl_blocks_v1` | STORAGE_KEYS.blocks (js/core/state.js) |
| `cl_brandWorkshops_v1` | STORAGE_KEYS.brandWorkshops (js/core/state.js) |
| `cl_brands_v2` | STORAGE_KEYS.brands (js/core/state.js) |
| `cl_brands_ws_autoassign_v1` | js/data/catalog.js:381 |
| `cl_change_log_v1` | STORAGE_KEYS.changeLog (js/core/state.js) |
| `cl_cl_line` | js/views/cl-checklist/cl-checklist.js:177 |
| `cl_cl_mode` | js/views/cl-checklist/cl-checklist.js:175 |
| `cl_cl_part` | js/views/cl-checklist/cl-checklist.js:176 |
| `cl_current_user` | js/views/cocl/cocl.js:189 |
| `cl_custom_triggers_v1` | STORAGE_KEYS.customTriggers (js/core/state.js) |
| `cl_dashboard_from` | js/views/dashboard.js:23 |
| `cl_dashboard_period` | js/views/dashboard.js:19 |
| `cl_dashboard_to` | js/views/dashboard.js:24 |
| `cl_dashboard_workshop` | js/views/dashboard.js:278 |
| `cl_editor_block` | js/core/modal.js:130 |
| `cl_editor_line` | js/router.js:66 |
| `cl_editor_mode` | js/router.js:52 |
| `cl_elec_subtab` | js/views/cl-checklist/cl-checklist.js:61 |
| `cl_electronic_brandschedule_v1` | STORAGE_KEYS.electronicBrandSchedule (js/core/state.js) |
| `cl_electronic_params_v1` | STORAGE_KEYS.electronicParams (js/core/state.js) |
| `cl_electronic_shiftcfg_v1` | STORAGE_KEYS.electronicShiftCfg (js/core/state.js) |
| `cl_history_filters` | js/views/history/history.js:7 |
| `cl_history_v2` | STORAGE_KEYS.history (js/core/state.js) |
| `cl_lineBrands_v2` | STORAGE_KEYS.lineBrands (js/core/state.js) |
| `cl_lineMachines_v1` | STORAGE_KEYS.lineMachines (js/core/state.js) |
| `cl_line_brand_events_v1` | STORAGE_KEYS.lineBrandEvents (js/core/state.js) |
| `cl_lines_v2` | STORAGE_KEYS.lines (js/core/state.js) |
| `cl_nodes_v2` | STORAGE_KEYS.nodes (js/core/state.js) |
| `cl_operators_v2` | STORAGE_KEYS.operators (js/core/state.js) |
| `cl_photos_broken_count` | js/views/settings/photos.js:200 |
| `cl_recent_lines` | js/views/editor/editor-core.js:12 |
| `cl_schedule_line` | js/views/dashboard.js:609 |
| `cl_schedule_mode` | js/views/schedule/schedule.js:34 |
| `cl_schedule_part` | js/views/schedule/schedule.js:36 |
| `cl_schedule_weeks_v1` | STORAGE_KEYS.scheduleWeeks (js/core/state.js) |
| `cl_settings_panel` | js/views/settings/settings-shell.js:9 |
| `cl_shifts_v2` | STORAGE_KEYS.shifts (js/core/state.js) |
| `cl_sidebar_pinned` | js/router.js:123 |
| `cl_standards_v3` | STORAGE_KEYS.standards (js/core/state.js) |
| `cl_theme` | js/app.js:159 |
| `cl_tl_line` | js/views/toploss/toploss.js:10 |
| `cl_toploss_ws_split_v1` | js/data/catalog.js:296 |
| `cl_toplosses_v1` | STORAGE_KEYS.topLosses (js/core/state.js) |
| `cl_triggers_ws_v1` | js/data/catalog.js:445 |
| `cl_workshops_migration_smd_cell_named` | js/data/workshops.js:24 |
| `cl_workshops_v1` | STORAGE_KEYS.workshops (js/core/state.js) |
