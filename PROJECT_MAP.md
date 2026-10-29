# Карта проекта COCL

Сгенерировано 2026-10-29 по коммиту `5a08a16 Данные: запись по одной записи, смены и пользователь в js/data/` скриптом `.claude/skills/cocl-session-close/scripts/gen_project_map.py` — пересоздавайте после крупных правок.

JS — 72 модулей, 21327 строк, 780 функций · CSS — 40 файлов, 11067 строк.
Как искать: модуль по назначению → раздел в таблице ниже → `Grep` по имени функции в этом файле.

## JS-модули (в порядке подключения в index.html)

Все модули — обычные `<script>` с общим пространством имён. Код, выполняемый при загрузке, не может ссылаться на модули, подключённые позже — проверка: `node .claude/skills/cocl-review/scripts/check_load_order.js`.

| Модуль | Строк | Функций | Назначение |
| --- | --- | --- | --- |
| `js/router.js` | 244 | 4 | РОУТЕР — навигация между вкладками с сохранением в URL |
| `js/core/utils.js` | 101 | 15 | ЯДРО: утилиты |
| `js/core/state.js` | 158 | 0 | ЯДРО: константы и состояние |
| `js/core/dates.js` | 148 | 14 | ЯДРО: даты, недели, смены |
| `js/core/modal.js` | 134 | 4 | ЯДРО: стек модальных окон |
| `js/data/standards.js` | 451 | 35 | ДАННЫЕ: стандарты и история |
| `js/data/workshops.js` | 168 | 12 | ДАННЫЕ: структура производства |
| `js/data/catalog.js` | 413 | 36 | ДАННЫЕ: справочники |
| `js/data/schedule.js` | 224 | 14 | ДАННЫЕ: расписание CL |
| `js/data/downtime.js` | 57 | 6 | ДАННЫЕ: простои линии |
| `js/data/debt.js` | 136 | 6 | ДАННЫЕ: долг проверок CL |
| `js/data/changelog.js` | 257 | 14 | ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ СТАНДАРТОВ |
| `js/data/line-brand.js` | 99 | 7 | ТЕКУЩИЙ БРЕНД ЛИНИИ |
| `js/data/comments.js` | 58 | 6 | КОММЕНТАРИИ К СТАНДАРТАМ И E-PARAM |
| `js/data/ack.js` | 71 | 6 | ОЗНАКОМЛЕНИЕ СО СТАНДАРТОМ / E-PARAM |
| `js/data/shifts.js` | 65 | 3 | ДАННЫЕ: график смен (cl_electronic_shiftcfg_v1) |
| `js/data/user.js` | 16 | 1 | ДАННЫЕ: текущий пользователь |
| `js/components/pickers.js` | 436 | 14 | КОМПОНЕНТЫ: окна выбора |
| `js/components/validation.js` | 212 | 7 | КОМПОНЕНТЫ: валидация нового стандарта / E-Param |
| `js/components/std-comments.js` | 202 | 6 | КОМПОНЕНТЫ: вкладка «Комментарии» стандарта / E-Param |
| `js/components/std-ack.js` | 146 | 5 | КОМПОНЕНТЫ: вкладка «Ознакомление» стандарта / E-Param |
| `js/components/notify.js` | 238 | 13 | КОМПОНЕНТЫ: колокольчик уведомлений в шапке |
| `js/components/line-picker.js` | 180 | 10 | КОМПОНЕНТЫ: выбор линии |
| `js/components/photo-slider.js` | 105 | 3 | КОМПОНЕНТЫ: слайдер фото стандарта |
| `js/components/check-run.js` | 116 | 7 | КОМПОНЕНТЫ: окно проверки «список слева — стандарт справа» |
| `js/components/standard-view.js` | 330 | 14 | КОМПОНЕНТЫ: окно просмотра стандарта |
| `js/components/quick-add-machine.js` | 81 | 2 | КОМПОНЕНТЫ: быстрое добавление машины к линии |
| `js/components/cil-table.js` | 215 | 15 | КОМПОНЕНТЫ: таблица недели в стиле CIL |
| `js/components/legend.js` | 32 | 1 | ЛЕГЕНДА ТАБЛИЦ |
| `js/components/pager.js` | 55 | 2 | ПАГИНАЦИЯ (общий компонент) |
| `js/components/tab-head.js` | 19 | 1 | КОМПОНЕНТЫ: шапка вкладки — цветная плашка с шагами |
| `js/components/mj-notice.js` | 72 | 2 | КОМПОНЕНТЫ: уведомление «Сделайте запись в Machine Journal» |
| `js/components/line-brand-picker.js` | 54 | 2 | КОМПОНЕНТЫ: «Бренд на линии» — плашка и окно выбора |
| `js/io/excel-common.js` | 57 | 1 | EXCEL: общие функции шаблонов |
| `js/io/standards-io.js` | 737 | 23 | EXCEL: шаблон, экспорт и импорт стандартов линии |
| `js/views/brand-schedule.js` | 396 | 7 | ВКЛАДКА CL: расписание брендов |
| `js/views/cocl/cocl.js` | 1037 | 32 | ВКЛАДКА «CL при переходах» |
| `js/views/cocl/cocl-save.js` | 181 | 2 | ВКЛАДКА «CL при переходах»: сохранение |
| `js/views/cocl/cocl-pick.js` | 168 | 7 | ВКЛАДКА «CL при переходах»: экран выбора линии |
| `js/views/cl-checklist/cl-checklist.js` | 890 | 31 | ВКЛАДКА «Чек-лист CL» |
| `js/views/cl-checklist/quick-check.js` | 462 | 12 | ВКЛАДКА «Чек-лист CL»: быстрая проверка |
| `js/views/cl-checklist/cl-board.js` | 120 | 4 | ЧЕК-ЛИСТ CL: «Итог смены для доски» |
| `js/views/toploss/toploss.js` | 509 | 19 | ВКЛАДКА «TOP Losses»: разбор потерь линии |
| `js/views/toploss/toploss-check.js` | 461 | 13 | TOP LOSSES: проверка, сохранение, итог |
| `js/views/history/history-data.js` | 265 | 24 | ИСТОРИЯ: данные |
| `js/views/history/history.js` | 587 | 29 | ВКЛАДКА «История»: лента проверок по дням и сменам |
| `js/views/history/history-record.js` | 323 | 10 | ИСТОРИЯ: страница проверки (вместо окна «Просмотр проверки») |
| `js/views/history/history-standard.js` | 195 | 6 | ИСТОРИЯ: история одного стандарта / E-Param |
| `js/views/history/history-export.js` | 607 | 11 | ИСТОРИЯ: экспорт CSV / XLSX |
| `js/views/dashboard.js` | 641 | 28 | ВКЛАДКА «Дашборд» |
| `js/views/editor/editor-core.js` | 747 | 18 | ВКЛАДКА «Стандарты CL»: каркас |
| `js/views/editor/editor-mech.js` | 257 | 11 | СТАНДАРТЫ CL: таблица механических стандартов |
| `js/views/editor/editor-elec.js` | 497 | 11 | СТАНДАРТЫ CL: таблица электронных параметров + Excel |
| `js/views/editor/editor-bulk.js` | 134 | 8 | СТАНДАРТЫ CL: панель массовых действий над выбранными строками |
| `js/views/editor/eparam-page.js` | 478 | 10 | СТРАНИЦА электронного параметра |
| `js/views/editor/changelog-view.js` | 515 | 19 | СТАНДАРТЫ CL: ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ |
| `js/views/standard-page/standard-page.js` | 762 | 21 | СТРАНИЦА стандарта: открытие, поля, точки |
| `js/views/standard-page/standard-page-extra.js` | 618 | 10 | СТРАНИЦА стандарта: фото, связи, доп. информация, сохранение |
| `js/views/schedule/schedule.js` | 906 | 28 | ВКЛАДКА «Расписание CL» |
| `js/views/schedule/schedule-add.js` | 447 | 8 | РАСПИСАНИЕ CL: добавление стандартов |
| `js/views/schedule/schedule-downtime.js` | 154 | 8 | РАСПИСАНИЕ CL: простой линии |
| `js/views/settings/settings-shell.js` | 155 | 9 | НАСТРОЙКИ: каркас вкладки |
| `js/views/settings/structure-tree.js` | 658 | 18 | НАСТРОЙКИ: структура производства — дерево и карточка линии |
| `js/views/settings/shifts.js` | 156 | 5 | НАСТРОЙКИ: график смен |
| `js/views/settings/toplosses.js` | 471 | 9 | НАСТРОЙКИ: Top Losses |
| `js/views/settings/brands.js` | 342 | 6 | НАСТРОЙКИ: общий список брендов |
| `js/views/settings/operators.js` | 208 | 7 | НАСТРОЙКИ: операторы |
| `js/views/settings/triggers.js` | 189 | 5 | НАСТРОЙКИ: триггеры Change Over |
| `js/views/settings/opl-import.js` | 54 | 2 | НАСТРОЙКИ: импорт бланков OPL из журнала |
| `js/views/settings/photos.js` | 380 | 10 | НАСТРОЙКИ: хранилище и проверка фото |
| `js/components/hotkeys.js` | 75 | 4 | ГОРЯЧИЕ КЛАВИШИ |
| `js/app.js` | 195 | 7 | ЗАПУСК ПРИЛОЖЕНИЯ |

## JS — разделы и функции

| Файл:строка | Раздел | Функции |
| --- | --- | --- |
| js/router.js:1 | (начало модуля) | `pageHasUnsaved`, `confirmLeavePage`, `switchTab`, `initRouter` |
| js/core/utils.js:8 | УТИЛИТЫ | `cmtIcon`, `cmtLine`, `$`, `$$`, `showToast`, `fmtDate`, `uid`, `escapeHtml`, `getPhotoPath`, `escapeAttr` |
| js/core/utils.js:75 | ДОСТУП К ДАННЫМ | `withLoadCache`, `load`, `save`, `getOperators`, `setOperators` |
| js/core/dates.js:1 | (начало модуля) | `todayISO`, `addDaysISO`, `getWeekDays`, `getClWeekDays`, `getWeekLabel`, `fmtISODate`, `shiftCfgCached`, `daysSinceStart`, `getDayShiftForDate`, `getNightShiftForDate`, `getShiftsForDate`, `getCurrentShiftPeriod`, `getShiftForDate`, `fmtShortDate` |
| js/core/modal.js:8 | СТЕК МОДАЛЬНЫХ ОКОН | `openModal`, `closeModal`, `bindModalBackdropClose`, `pluralizeStandards` |
| js/data/standards.js:8 | ФАБРИКА СТАНДАРТА — единая структура | `createEmptyStandard`, `normalizeAppliesTo`, `normalizeMeasurements`, `parseNorm`, `classifyNormValue`, `normWork`, `isNormMark`, `normTypeError` |
| js/data/standards.js:219 | ТИПЫ КОНТРОЛЯ — миграция на 3 канонических типа | `hasToleranceInMeasurements`, `pointsAreMarksOnly`, `marksText`, `migrateControlType`, `normalizeStandard`, `getStandards`, `setStandards`, `getHistory`, `setHistory`, `upsertById`, `saveStandards`, `saveStandard`, `removeStandard`, `saveHistoryRecords` … +2 |
| js/data/standards.js:343 | ВАЛИДАЦИЯ НОВОГО СТАНДАРТА / E-PARAM | `valShiftIndex`, `valShiftFromIndex`, `makeValidation`, `validationShiftCount`, `normalizeValidation`, `isOnValidation`, `isValidationShift`, `valUntilIndex`, `isValidationDay`, `validationStatus`, `validationShiftsLeft` |
| js/data/workshops.js:8 | СТРУКТУРА ПРОИЗВОДСТВА — доступ к данным | `migrateToWorkshopsStructure`, `getWorkshops`, `setWorkshops`, `getWorkshop`, `getWorkshopName`, `getBlockForLine`, `getWorkshopIdForLine`, `getAllLinesWithContext` |
| js/data/workshops.js:131 | ОБРАТНАЯ СОВМЕСТИМОСТЬ | `getLines`, `getLineMachines` |
| js/data/workshops.js:157 | Часть линии (Maker / Packer) есть только у линий SMD. | `lineHasParts`, `linePartFilter` |
| js/data/catalog.js:8 | TOP LOSSES — доступ к данным | `getTopLosses`, `getElectronicParams`, `setElectronicParams`, `saveElectronicParams`, `saveElectronicParam`, `removeElectronicParam`, `makeElectronicParamId`, `eparamLegacyMeasurements`, `normalizeElectronicParam`, `normalizeElectronicFrequency`, `getElectronicParamsForLine`, `getElectronicBrandScheduleForLine`, `getElectronicBrandForDate`, `setTopLosses` … +22 |
| js/data/schedule.js:8 | РАСПИСАНИЕ CL — ПОНЕДЕЛЬНЫЕ ПРАВКИ (оверрайды) | `getSchWeekStart`, `getScheduleWeeks`, `setScheduleWeeks`, `getScheduleWeekOverride`, `setScheduleWeekOverride`, `hasScheduleWeekOverride` |
| js/data/schedule.js:76 | РАСПИСАНИЕ CL — ВЕРСИИ ШАБЛОНА | `autoTimeWindows`, `getTimeWindowShift`, `getRowTemplateForWeek`, `rowExistedByShiftEnd`, `isRowPlanned`, `getRowForWeek`, `setRowTemplateFrom`, `isShiftPast` |
| js/data/downtime.js:1 | (начало модуля) | `downtimeReasonText`, `dtShiftText`, `dtPeriodText`, `getLineDowntimes`, `setLineDowntimes`, `isDowntimeShift` |
| js/data/debt.js:1 | (начало модуля) | `clLineRows`, `clResultIndex`, `clDoneResult`, `clRowInSchedule`, `clRowTimeline`, `clTallyIndex` |
| js/data/changelog.js:1 | (начало модуля) | `getChangeLog`, `setChangeLog`, `changeLogSnapshot`, `addChangeLogEntry`, `appendChangeLog`, `updateChangeLogEntry`, `removeChangeLogEntry`, `getChangeLogForLine`, `getChangeLogForRef`, `clJson`, `clBrandsDiff`, `clDetailText`, `describeRowChange`, `logRowChange` |
| js/data/line-brand.js:1 | (начало модуля) | `getLineBrandEvents`, `setLineBrandEvents`, `addLineBrandEvent`, `getLineBrandNow`, `lineBrandSourceText`, `isRestBrandLabel`, `pickBrandValues` |
| js/data/comments.js:1 | (начало модуля) | `getStdComments`, `setStdComments`, `getStdCommentsFor`, `addStdComment`, `updateStdComment`, `removeStdComment` |
| js/data/ack.js:1 | (начало модуля) | `getStdAck`, `setStdAck`, `stdAckIsMajor`, `getStdAckEditions`, `getStdAckStatus`, `addStdAck` |
| js/data/shifts.js:1 | (начало модуля) | `sanitizeCycleArray`, `getElectronicShiftConfig`, `setElectronicShiftConfig` |
| js/data/user.js:1 | (начало модуля) | `getCurrentUser` |
| js/components/pickers.js:18 | КОММЕНТАРИЙ К ДЕАКТИВАЦИИ | `openDeactivationCommentModal`, `closeDeactivationCommentModal` |
| js/components/pickers.js:122 | TOP LOSSES стандарта — выбор через окно | `openTopLossPickerFor` |
| js/components/pickers.js:141 | Окно выбора потерь: слева категории цеха, справа потери, | `openTopLossPickerModal`, `closeTopLossPickerModal`, `getTopLossPickerWorkshop`, `renderTopLossPicker`, `updateTopLossPickerCounter`, `applyTopLossPicker` |
| js/components/pickers.js:314 | ВЫБОР ТРИГГЕРОВ CHANGE OVER — общая модалка | `openTriggerPickerModal`, `renderTriggerPickerList`, `updateTriggerPickerCounter`, `closeTriggerPickerModal`, `renderTriggerChipsEditable` |
| js/components/validation.js:1 | (начало модуля) | `valShiftLabel`, `valPointLabel`, `valChipHtml`, `valEditBlockHtml`, `valReadEdit`, `valCheckStats`, `valBannerHtml` |
| js/components/std-comments.js:1 | (начало модуля) | `stdReason`, `stdcSvg`, `stdCommentWhen`, `stdCommentRowHtml`, `renderStdComments`, `stdCommentsRefresh` |
| js/components/std-ack.js:1 | (начало модуля) | `stdAckWhen`, `stdAckIcon`, `stdAckChangesHtml`, `stdAckPlateHtml`, `renderStdAck` |
| js/components/notify.js:1 | (начало модуля) | `getNotifyRead`, `setNotifyRead`, `notifyRef`, `notifyRefTitle`, `notifyRefMeta`, `collectNotifications`, `notifyDayLabel`, `notifyTime`, `updateNotifyBadge`, `renderNotifyPanel`, `openNotifyPanel`, `closeNotifyPanel`, `openNotifyTarget` |
| js/components/line-picker.js:8 | ВЫБОР ЛИНИИ — двухпанельное окно (#linePickerModal) | `resetLinePickerState`, `getLinePickerGroups`, `countLinePickerLines`, `openLinePickerModal`, `closeLinePickerModal`, `renderLinePickerModal`, `renderLinePickerRecent`, `renderLinePickerBrowse`, `renderLinePickerGroup`, `renderLinePickerSearch` |
| js/components/photo-slider.js:1 | (начало модуля) | `photoSliderHtml`, `photoSliderGo`, `bindPhotoSlider` |
| js/components/check-run.js:1 | (начало модуля) | `chkLeftHeadHtml`, `chkLeftFootHtml`, `chkEntryInner`, `chkDetailHtml`, `chkFailsWord`, `chkUpdateProgress`, `chkMarkComment` |
| js/components/standard-view.js:8 | ПРОСМОТР СТАНДАРТА — полноценная модалка | `controlTypeLabel`, `controlTypeHintHtml`, `formatDateTime`, `openStandardView`, `renderStandardViewHeaderChips`, `svmText`, `renderStandardViewContent`, `closeStandardView` |
| js/components/standard-view.js:243 | ЛАЙТБОКС — просмотр фото | `openLightbox`, `updateLightbox`, `lightboxPrev`, `lightboxNext`, `closeLightbox`, `lightboxKeyHandler` |
| js/components/quick-add-machine.js:8 | БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра) | `openQuickAddMachineModal`, `closeQuickAddMachineModal` |
| js/components/cil-table.js:9 | ИКОНКИ (Feather) | `cilZoneMap`, `cilSortRows`, `cilDateByDayIdx`, `cilTimeChips`, `cilWorkTag` |
| js/components/cil-table.js:73 | НОРМА / ТОЧКИ | `cilPointsWord`, `cilPointChip`, `cilNorm` |
| js/components/cil-table.js:144 | ШАПКА: дни и смены с буквами смен | `cilHeadHtml`, `cilRowDurationSec`, `formatCilDuration`, `cilDurChip`, `cilShiftTotalHtml`, `cilShiftProgress`, `cilTdClass` |
| js/components/legend.js:1 | (начало модуля) | `legendHtml` |
| js/components/pager.js:1 | (начало модуля) | `pagerRange`, `renderPager` |
| js/components/tab-head.js:1 | (начало модуля) | `tabStepsHtml` |
| js/components/mj-notice.js:1 | (начало модуля) | `showMachineJournalNotice`, `closeMachineJournalNotice` |
| js/components/line-brand-picker.js:1 | (начало модуля) | `lineBrandBarHtml`, `openLineBrandPicker` |
| js/io/excel-common.js:7 | ИМПОРТ/ЭКСПОРТ: ШАБЛОНЫ | `styleTemplateHeader` |
| js/io/standards-io.js:1 | (начало модуля) | `xlTypeFromText`, `xlsxHeadStyle`, `xlsxBodyStyle`, `xlAutoCell`, `xlList`, `xlStdKey`, `stdRowFromStandard`, `buildListsSheet`, `xlListRanges`, `buildStdSheet`, `buildPointsSheet`, `buildInfoSheet`, `buildStandardsWorkbook` |
| js/io/standards-io.js:288 | РЕДАКТОР: скачать шаблон для линии | `editorDownloadTemplate` |
| js/io/standards-io.js:325 | РЕДАКТОР: экспорт стандартов линии в XLSX | `editorExportLine` |
| js/io/standards-io.js:353 | ИМПОРТ: разбор файла (новый и старый формат листа «Точки») | `xlCellText`, `xlIsBareFormula`, `parseStandardsExcelV3` |
| js/io/standards-io.js:570 | ИМПОРТ: бланк OPL из журнала (один лист — один стандарт) | `oplCleanValue`, `oplDurationSec`, `oplDate`, `oplSheetToStandard`, `parseOplJournalExcel` |
| js/views/brand-schedule.js:8 | CL ELECTRONIC — расписание брендов | `getElectronicBrandSchedule`, `setElectronicBrandSchedule` |
| js/views/brand-schedule.js:29 | CL ELECTRONIC — модалка «Расписание брендов» | `openElectronicBrandSchedule`, `closeElectronicBrandSchedule`, `fillBrandSelectOptions` |
| js/views/brand-schedule.js:108 | Режим «По дням» — рендер строк | `renderEbsDailyRows` |
| js/views/brand-schedule.js:167 | Превью итогового расписания | `renderEbsPreview` |
| js/views/cocl/cocl.js:8 | COCL: экран резюме после сохранения проверки | `renderCoclSummary` |
| js/views/cocl/cocl.js:148 | ВКЛАДКА ПРОВЕРКА | `fillLinesForOperator`, `setCoclLine`, `clearCoclLine`, `getCoclBrandOfDay`, `fillBrandsForLine`, `renderCoclBrandTiles`, `closeCoclBrandPops`, `renderCoclLineContext`, `renderCoclPartStep`, `updateCoclStepStates`, `openCoclTab`, `onTransitionTypeChange`, `renderMaterialChanges`, `getSelectedTriggers` |
| js/views/cocl/cocl.js:503 | Показ стандарта в Change Over — логика «отличий точек» | `getEffectiveBrandBlock`, `brandBlocksDiffer`, `standardMatchesTriggers`, `getCoclRelevant`, `updateChecklist`, `renderChecklist` |
| js/views/cocl/cocl.js:780 | COCL: строки чек-листа — обработчики | `bindCoclAccordionEvents`, `coclSelectItem`, `coclStep`, `coclAdvanceLater`, `updateCoclItemStatus`, `updateCoclItemStatusFromPoints`, `updateProgress` |
| js/views/cocl/cocl.js:990 | COCL: Сворачивание верхней части и показ чек-листа | `buildChecklistView`, `updateChecklistForCheck`, `setCoclCheckingUi`, `editChecklistConditions` |
| js/views/cocl/cocl-save.js:7 | СОХРАНЕНИЕ ПРОВЕРКИ | `saveCoclCheck`, `resetCheckForm` |
| js/views/cocl/cocl-pick.js:1 | (начало модуля) | `pickLineStats`, `pickTileHtml`, `coclLinePickStats`, `coclPickTile`, `renderCoclLinePick`, `renderCoclHead`, `updateCoclPick` |
| js/views/cl-checklist/cl-checklist.js:8 | ПРОВЕРКА CL — логика | `openClCheckTab`, `updateClLinePill`, `updateClPartSwitchVisibility`, `updateClCheckButtons`, `updateClContext`, `openClBrandOverrideDialog`, `updateClPanelCount`, `renderClMatrix`, `updateClPartCounts`, `cilIsoWeek`, `clHistoryIndex`, `clCellCounts`, `clRowCells`, `bindClWeekNav` … +8 |
| js/views/cl-checklist/cl-checklist.js:600 | КАРТОЧКА ЯЧЕЙКИ: итог прошлой проверки | `closeClPeek`, `showClPeek`, `flashClCell`, `quickSetClCell`, `clShiftPlannedCount`, `startClCheck`, `stopClCheck`, `saveClDraftToHistory` |
| js/views/cl-checklist/cl-checklist.js:821 | ПРОВЕРКА CL — обработчики | `toggleClOnlyShift` |
| js/views/cl-checklist/quick-check.js:8 | БЫСТРАЯ ПРОВЕРКА — состояние и открытие | `qcNum`, `getQcBrandPick`, `getQcFields`, `qcIsMark`, `getQcQueue`, `getQcNext`, `getQcPrevious`, `openClCheckModal`, `updateQcResult` |
| js/views/cl-checklist/quick-check.js:309 | БЫСТРАЯ ПРОВЕРКА — закрытие | `closeQuickCheckModal` |
| js/views/cl-checklist/quick-check.js:320 | БЫСТРАЯ ПРОВЕРКА — сохранение | `saveQuickCheck` |
| js/views/cl-checklist/quick-check.js:407 | БЫСТРАЯ ПРОВЕРКА — хелперы | `getRowMeasurementBlock` |
| js/views/cl-checklist/cl-board.js:1 | (начало модуля) | `clBoardSummary`, `clBoardMin`, `clBoardText`, `openClBoardSummary` |
| js/views/toploss/toploss.js:23 | ИКОНКИ КАТЕГОРИЙ (Feather-стиль) | `tlCatKind` |
| js/views/toploss/toploss.js:36 | ДАННЫЕ | `tlCollectRows`, `tlRecentShifts`, `tlRecentDays`, `tlDayStatus`, `tlHistoryIndex`, `tlRowShiftStatuses`, `tlLossStats`, `tlLastCheck` |
| js/views/toploss/toploss.js:138 | ЛИНИЯ | `fillTopLossTab`, `setTopLossLine` |
| js/views/toploss/toploss.js:161 | РЕНДЕР ЭКРАНА РАЗБОРА | `renderTopLossCategories` |
| js/views/toploss/toploss.js:219 | ВЫБОР ЛИНИИ НА ЭКРАНЕ (линия ещё не выбрана) | `tlLinePickStats`, `tlPickTile`, `renderTopLossLinePick`, `renderTopLossSide`, `renderTopLossDiag` |
| js/views/toploss/toploss.js:438 | ОБРАБОТЧИКИ | `backToTopLossLinePick`, `backToTopLossSelect` |
| js/views/toploss/toploss-check.js:1 | (начало модуля) | `tlCheckPoints`, `tlPointLabelHtml`, `tlPointState`, `tlCheckStatusFromValues` |
| js/views/toploss/toploss-check.js:62 | ОТКРЫТИЕ ПРОВЕРКИ | `buildTopLossChecklist`, `renderTopLossChecklist`, `updateTlCheckProgress`, `tlCheckRefreshItem` |
| js/views/toploss/toploss-check.js:195 | СОХРАНЕНИЕ | `saveTopLossCheck` |
| js/views/toploss/toploss-check.js:273 | ИТОГ ПРОВЕРКИ | `renderTopLossSummary` |
| js/views/toploss/toploss-check.js:356 | ОБРАБОТЧИКИ | `tlSelectItem`, `tlStep`, `tlAdvanceLater` |
| js/views/history/history-data.js:1 | (начало модуля) | `histKind`, `histKindLabel`, `histIcon`, `histShift`, `histOrderKey`, `getHistoryModeText`, `formatClShift`, `histTime`, `histDayName`, `histDayTitle`, `histIsElecItem`, `histItemNorms`, `histItemValues`, `histNum` … +10 |
| js/views/history/history.js:1 | (начало модуля) | `loadHistFilters`, `saveHistFilters` |
| js/views/history/history.js:38 | ФИЛЬТРЫ | `fillHistoryFilters`, `histPeriodMatch`, `histSearchMatch`, `histScopeLines`, `getFilteredHistory`, `histPickMatch` |
| js/views/history/history.js:120 | РЕНДЕР | `histShowView`, `renderHistory`, `renderHistoryMain`, `histScopeCtx`, `renderHistCrumbs`, `histActiveFilters`, `renderHistTotals`, `pluralRu`, `histIsoWeek`, `histRecordContext`, `histRecordSub`, `histResultHtml`, `renderHistFeed`, `histRecHtml` … +3 |
| js/views/history/history.js:473 | ОБРАБОТЧИКИ | `histFilterChanged`, `histSetLine`, `histSetScope`, `viewRecord` |
| js/views/history/history-record.js:1 | (начало модуля) | `histOpenSub`, `histBack`, `openHistoryRecord`, `openHistoryShift`, `histPageData`, `histNeighbors`, `histNavLabel`, `renderHistRecordPage`, `histItemHtml`, `histMjText` |
| js/views/history/history-standard.js:1 | (начало модуля) | `openStandardHistory`, `histStdBack`, `histStdData`, `histStdBrand`, `histStdWhereHtml`, `renderStandardHistory` |
| js/views/history/history-export.js:7 | ЭКСПОРТ: детали и CSV | `buildDetailsText`, `exportToCsv` |
| js/views/history/history-export.js:90 | ЭКСПОРТ В XLSX (ExcelJS) | `xlBorder`, `xlHeaderCell`, `xlSheetWriter`, `exportToXlsx`, `buildSheetChecks`, `buildSheetAnalytics` |
| js/views/history/history-export.js:441 | XLSX: лист «Потери» — аналитика по TOP Losses | `buildSheetLosses` |
| js/views/history/history-export.js:513 | XLSX: лист «CL» — аналитика по Чек-листу CL (мех + электро) | `buildSheetCL` |
| js/views/history/history-export.js:586 | СКАЧИВАНИЕ ФАЙЛОВ | `downloadBlob` |
| js/views/dashboard.js:26 | ДАННЫЕ | `dashSlots`, `dashSlotKey`, `dashFirstDate`, `dashLines`, `dashLineTally`, `dashWithTally`, `dashClMetrics`, `dashRecords`, `dashSummary`, `dashWeeks` |
| js/views/dashboard.js:196 | РЕНДЕР: ГЛАВНЫЙ ЭКРАН | `renderDashboard`, `renderDashboardMain`, `dashShareText`, `dashDoneCell`, `dashFailCell`, `dashPartRowsHtml`, `dashTreeHtml`, `renderDashboardHead`, `dashDelta`, `dashKpisHtml`, `dashWeeksHtml`, `dashLettersHtml` |
| js/views/dashboard.js:423 | ПАСПОРТ ЛИНИИ: «дашборд одной линии» — показатели, оборудова | `openDashboardLine`, `dashMachines`, `dashEquipHtml`, `dashLineSideHtml`, `renderDashboardLine`, `renderDashboardLineMain` |
| js/views/editor/editor-core.js:8 | РЕДАКТОР: недавние линии и режим просмотра | `getRecentLines`, `addRecentLine`, `getRecentStandards`, `addRecentStandard`, `renderEditorRecentStd` |
| js/views/editor/editor-core.js:128 | Выбор линии | `selectLine` |
| js/views/editor/editor-core.js:179 | Обновление UI: чип + крошки + счётчики | `updateEditorLineContext`, `buildEditorCrumbs` |
| js/views/editor/editor-core.js:257 | Счётчики Maker / Packer | `updatePartCounters` |
| js/views/editor/editor-core.js:300 | Переключатель режима внутри панели | `switchEditorModeInline` |
| js/views/editor/editor-core.js:334 | Обработчики | `bindPartSwitchHandlers` |
| js/views/editor/editor-core.js:421 | РЕДАКТОР: обновление сброса фильтров | `resetMechFilters`, `resetElecFilters`, `renderEditorPagination` |
| js/views/editor/editor-core.js:580 | РЕДАКТОР: заполнение фильтров | `fillEditorFilters`, `fillEditorMachineSelect` |
| js/views/editor/editor-core.js:629 | РЕДАКТОР: копирование стандарта | `copyStandardNew` |
| js/views/editor/editor-core.js:658 | РЕДАКТОР: удаление стандарта | `deleteStandardNew` |
| js/views/editor/editor-mech.js:7 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация | `getFilteredMechStandards`, `editorAppliesMatch`, `editorRowSchedule` |
| js/views/editor/editor-mech.js:62 | СТАНДАРТЫ CL: общие куски строки таблицы | `etAppliesHtml`, `etTypeNormHtml`, `etScheduleHtml`, `etStatusHtml`, `etGroupRow`, `etPluralStd` |
| js/views/editor/editor-mech.js:124 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы | `refreshEditorMechTable`, `updateMechSelectionUI` |
| js/views/editor/editor-elec.js:7 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация | `getFilteredElecParams`, `etPluralParam` |
| js/views/editor/editor-elec.js:51 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы | `refreshEditorElecTable`, `updateElecSelectionUI` |
| js/views/editor/editor-elec.js:184 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: шаблон / экспорт / импорт Excel | `epKey`, `epRowFromParam`, `buildEparamWorkbook`, `editorElecDownloadTemplate`, `editorElecExport`, `parseValuesByBrand`, `parseElectronicParamsExcel` |
| js/views/editor/editor-bulk.js:1 | (начало модуля) | `bulkKindInfo`, `updateEditorBulk`, `bulkRefresh`, `bulkAddToSchedule`, `bulkSetApplies`, `bulkClear`, `bulkBarHtml`, `initEditorBulk` |
| js/views/editor/eparam-page.js:9 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА | `openEparamPage`, `closeEparamPage`, `renderEparamPage`, `applyEparamMode`, `renderEparamHistory`, `switchEparamTab`, `renderEparamMainFields`, `renderEparamNorm`, `renderEparamRelated`, `renderEparamExtra` |
| js/views/editor/changelog-view.js:1 | (начало модуля) | `clogFmtDate`, `clogMachineNode`, `clogNumberText`, `clogActionChip`, `clogRefExists`, `getClogPart`, `getFilteredChangeLog`, `refreshChangeLogView`, `clogPluralEntry`, `changeHistoryHtml`, `askChangeReason`, `openChangeLogEntry`, `openNewChangeLogEntry`, `clogRefOptions` … +5 |
| js/views/standard-page/standard-page.js:8 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full) — открытие и заполнение | `openStandardFullView` |
| js/views/standard-page/standard-page.js:57 | ССЫЛКА НА СТАНДАРТ: index.html#standard/<id> | `standardLink`, `openStandardFromHash` |
| js/views/standard-page/standard-page.js:76 | СОЗДАНИЕ МЕХАНИЧЕСКОГО СТАНДАРТА | `openStandardCreatePage`, `closeStandardFullView`, `renderStandardFullView`, `renderSvFullCrumbs` |
| js/views/standard-page/standard-page.js:256 | Основная информация — поля | `renderSvMainFields`, `svFieldRow`, `formatSvDuration` |
| js/views/standard-page/standard-page.js:393 | Точки контроля и описание — блоки | `renderSvContentBlocks`, `buildSvContentBlocksHtml`, `svContentBlockEditable` |
| js/views/standard-page/standard-page.js:492 | Контроль правильности — таблица брендов × точек | `renderSvControlSection`, `renderReadonlyBrandsTable`, `renderSvBrandBlocksView` |
| js/views/standard-page/standard-page.js:573 | Таблица брендов × точек — рендер в новом экране | `renderSvBrandsTable`, `svBoxType`, `getSvTableState`, `renderSvBrandsTableFromState`, `bindSvControlEvents` |
| js/views/standard-page/standard-page-extra.js:8 | Фото | `renderSvFullPhotos` |
| js/views/standard-page/standard-page-extra.js:76 | Связанные объекты | `renderSvFullRelated` |
| js/views/standard-page/standard-page-extra.js:113 | Дополнительная информация (CL относится к, Триггеры, Top Los | `renderSvFullExtra` |
| js/views/standard-page/standard-page-extra.js:312 | Заглушки для таблиц вкладок | `renderSvAckTable`, `renderSvHistoryTable`, `refreshSvHistory`, `renderSvCommentsTable` |
| js/views/standard-page/standard-page-extra.js:344 | Переключение вкладок внутри просмотра | `switchSvFullTab` |
| js/views/standard-page/standard-page-extra.js:590 | ПОДСВЕТКА ЗНАЧЕНИЙ, НЕ ПОДХОДЯЩИХ ТИПУ КОНТРОЛЯ | `svPointTypeError`, `markSvPointTypes` |
| js/views/schedule/schedule.js:8 | РАСПИСАНИЕ CL — вкладка аналитика | `openScheduleTab`, `updateSchLinePill`, `updateSchPanelCount`, `isSchRowMember`, `isSchRowValidation`, `isSchRowShown`, `getFilteredScheduleRows`, `updateSchMatrixCounters`, `fillSchMachineFilter`, `renderScheduleMatrix`, `getSchRowFreq`, `getClRowFreq`, `getCheckedStandardIdsForWeek`, `ensureSchDraft` … +14 |
| js/views/schedule/schedule-add.js:7 | РАСПИСАНИЕ CL — модалка добавления стандартов | `openScheduleAddStandardsModal`, `closeScheduleAddStandardsModal`, `renderSchAddList`, `toggleSchAddItem`, `updateSchAddCounter`, `updateSchAddCheckAllState`, `confirmScheduleAddStandards`, `selectLine` |
| js/views/schedule/schedule-downtime.js:9 | ПРОСТОЙ — ОКНО | `openScheduleDowntimeModal`, `closeScheduleDowntimeModal`, `readSchDowntimeForm`, `syncSchDowntimeForm`, `saveSchDowntime` |
| js/views/schedule/schedule-downtime.js:84 | ПРОСТОЙ — СПИСОК ЛИНИИ | `renderSchDowntimeList`, `endSchDowntime`, `deleteSchDowntime` |
| js/views/settings/settings-shell.js:23 | ОТРИСОВКА ВСЕЙ ВКЛАДКИ | `renderSettings`, `getSavedSettingsPanel`, `showSettingsPanel`, `updateSettingsNavCounts` |
| js/views/settings/settings-shell.js:79 | ОБЩИЕ ПОМОЩНИКИ РАЗДЕЛОВ | `settingsChipsHtml`, `settingsSearchHtml`, `settingsHighlight`, `startInlineEdit`, `settingsWorkshopChipItems` |
| js/views/settings/structure-tree.js:20 | ДАННЫЕ | `stFindOwner`, `stDetachLine`, `stLineUsage`, `stOrphanLines`, `stAddLine`, `stMoveLine`, `stDeleteLine`, `stAddBlock`, `stRenameBlock`, `stDeleteBlock`, `stAddMachine`, `stRenameMachine`, `removeMachineFromLine`, `stToggleBrand` … +2 |
| js/views/settings/structure-tree.js:274 | ДЕРЕВО | `renderStructureSettings` |
| js/views/settings/structure-tree.js:404 | КАРТОЧКА ЛИНИИ | `renderStructureLineCard` |
| js/views/settings/shifts.js:7 | НАСТРОЙКИ: раздел «Смены» — редактор цикла смен | `shfIsDirty`, `shfBrigadesFor`, `renderElectronicShiftSettings`, `renderElectronicShiftPreview`, `pluralizeLines` |
| js/views/settings/toplosses.js:7 | TOP LOSSES — категории по цехам, правка в строке | `pluralizeLosses`, `tlCategoryKind`, `renderTopLossesSettings`, `tlSaveItem`, `deleteTopLossItem`, `deleteOperator` |
| js/views/settings/toplosses.js:186 | TOP LOSSES — шаблон и импорт Excel | `parseTopLossesExcel`, `parseOperatorsExcel`, `showImportReport` |
| js/views/settings/brands.js:7 | ОБЩИЙ СПИСОК БРЕНДОВ — справочник с фильтром по цеху | `getLinesForBrand`, `renderBrandsSettings`, `addBrandInline`, `renameBrand`, `deleteBrand` |
| js/views/settings/brands.js:225 | ИМПОРТ/ЭКСПОРТ БРЕНДОВ | `parseBrandsExcel` |
| js/views/settings/operators.js:7 | ОПЕРАТОРЫ — строки + inline + пагинация | `renderOperatorsSettings`, `highlightOperatorName`, `renderOperatorsPagination`, `changeOperatorsPage`, `sortOperatorsRus`, `openAddOperatorModal`, `closeAddOperatorModal` |
| js/views/settings/triggers.js:7 | НАСТРОЙКИ: пользовательские триггеры Change Over | `renderCustomTriggersSettings`, `addCustomTriggerInline`, `updateCustomTrigger`, `deleteCustomTrigger`, `getBrandsForLine` |
| js/views/settings/opl-import.js:1 | (начало модуля) | `renderOplImportSettings`, `oplImportSyncPart` |
| js/views/settings/photos.js:7 | КАРТОЧКА «ХРАНИЛИЩЕ ФОТО» | `renderPhotoStorageSettings` |
| js/views/settings/photos.js:28 | ПРОВЕРКА ФОТОГРАФИЙ НА БИТЫЕ ССЫЛКИ | `checkPhotoExists`, `runPhotosCheck`, `renderPhotosCheckResult`, `buildPhotosCheckReport`, `closePhotosCheckModal` |
| js/views/settings/photos.js:232 | ХРАНИЛИЩЕ ФОТО — обработчики | `fallbackCopy` |
| js/views/settings/photos.js:268 | БЭКАП: JSON (данные) и ZIP (данные + фото) | `collectBackup`, `applyBackup`, `backupStamp` |
| js/components/hotkeys.js:1 | (начало модуля) | `hkTopModal`, `hkVisible`, `hkSave`, `hkFocusSearch` |
| js/app.js:8 | ШАПКА: ЧАСЫ, СМЕНА И «КРУГ СМЕНЫ» | `tickClock`, `updateHeaderShift` |
| js/app.js:61 | СЧЁТЧИКИ В SIDEBAR | `updateNavHistoryCounter`, `updateNavSettingsBadge`, `updateNavCounters` |
| js/app.js:109 | ИНИЦИАЛИЗАЦИЯ | `init` |
| js/app.js:154 | ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (light / dark) | `applyTheme` |

## CSS (в порядке каскада)

Точка входа `style.css`: @import в этом порядке + anti-flash + печать. Переменные темы — `css/base.css`. Порядок @import менять нельзя — от него зависит каскад.

| Файл | Строк | Блоки |
| --- | --- | --- |
| `css/base.css` | 315 | BASE — переменные, сброс, типографика, ф; ШРИФТЫ «Аврора» (локально, работают без ; ТЕМА: Дневная (light) — по умолчанию; ТЕМА: Ночная (dark) — «Аврора» ночью; Сброс; Формы … +1 |
| `css/layout.css` | 406 | LAYOUT — header, sidebar, main, tabs, fo; Header; Layout; Вкладки; Sidebar; Кнопка закрепления sidebar … +6 |
| `css/components/ui-base.css` | 391 | Cards; Layout; Кнопки; Иконка «Просмотр стандарта» (глаз); Таблицы; Пустое состояние … +6 |
| `css/views/cocl-panel.css` | 475 | COCL: две панели — условия слева, чек-ли; Условия; Чек-лист |
| `css/components/forms.css` | 137 | Компактные чекбоксы типов (Редактор); Импорт: отчёт по ошибкам; Компактный список с поиском |
| `css/components/points.css` | 56 | Панель кнопок внизу карточки; Форма стандарта; Строка «селект + кнопка» |
| `css/views/settings-photo-card.css` | 78 | Карточка «Хранилище фото» |
| `css/views/dashboard.css` | 127 | ВКЛАДКА «ДАШБОРД»: карта производства и ; Показатели; Строки списков; Паспорт линии; Паспорт линии: метки настройки в шапке; ДАШБОРД: таблица «линия → часть → машина … +4 |
| `css/components/photos.css` | 259 | Результат проверки фото; Строка добавления фото (textarea + кнопк; МОДАЛКА ПРОСМОТРА СТАНДАРТА; ЛАЙТБОКС; Лайтбокс: счётчик фото |
| `css/components/theme-transition.css` | 17 |  |
| `css/views/editor-table.css` | 198 | Блоки в редакторе — плитки; Пагинация; ТАБЛИЦА СТАНДАРТОВ; Кнопки-иконки (векторные SVG); Кнопки «иконка + текст» |
| `css/views/toploss.css` | 778 | TOP LOSSES — вкладка (экран выбора); TOP LOSSES — экран резюме (Этап 4.2); TOP LOSSES: новое резюме (визуальное); TOP LOSSES: статус «Не проверено»; TOP LOSSES: подсказка про Journal Machin; TOP LOSSES — компактная шапка … +4 |
| `css/views/cl-electronic.css` | 128 | CL ELECTRONIC: расписание брендов |
| `css/views/settings-brands-operators.css` | 104 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам; ОПЕРАТОРЫ — строки + inline + пагинация; Подсветка совпадений поиска |
| `css/components/points-table.css` | 206 | Точки замера: таблица по брендам |
| `css/views/cocl-accordion.css` | 234 | COCL: строки чек-листа (группы по машина; ТОЧКА-МЕТКА: ОК / Не ОК вместо поля ввод |
| `css/views/toploss-accordion.css` | 145 | Модалка выбора потерь; ОКНО ВЫБОРА TOP LOSSES СТАНДАРТА |
| `css/views/editor.css` | 661 | РЕДАКТОР: чипы типов (ChangeOver / CL_TO; РЕДАКТОР: единая панель + фильтры + табл; РЕДАКТОР: карточка таблицы; РЕДАКТОР: таблица стандартов; РЕДАКТОР: чипы типов и Maker/Packer; РЕДАКТОР: крошки … +7 |
| `css/components/line-picker.css` | 319 | МОДАЛКА-ВЫБОР ЛИНИИ (двухпанельная) |
| `css/views/editor-part-switch.css` | 70 | РЕДАКТОР: переключатель по части линии |
| `css/views/schedule.css` | 534 | РАСПИСАНИЕ CL: матрица (с инфо-колонками; Тулбар над матрицей: фильтр+поиск слева,; Пустое состояние; Панель массовых операций; Адаптив; РАСПИСАНИЕ CL: модалка добавления станда … +3 |
| `css/views/cl-checklist.css` | 83 | ПРОВЕРКА CL: контекстная строка; Итог смены для доски |
| `css/views/standard-page.css` | 909 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full); Шапка; Вкладки внутри; Контент; Карточки; Поля «Основная информация» … +10 |
| `css/views/eparam-page.css` | 25 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА |
| `css/views/changelog.css` | 139 | СТАНДАРТЫ CL: ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ |
| `css/components/line-brand.css` | 64 | БРЕНД НА ЛИНИИ (Чек-лист CL, Расписание  |
| `css/views/settings.css` | 862 | НАСТРОЙКИ: каркас, меню разделов, справо; СТРУКТУРА: дерево + карточка линии; TOP LOSSES: категории цеха карточками; Адаптив; СТРУКТУРА: перенос линии; СПРАВОЧНИКИ: длинный список с прокруткой … +2 |
| `css/views/history.css` | 351 | ВКЛАДКА «ИСТОРИЯ»: лента, покрытие смен,; Шапка: заголовок, режим, период, Excel; Фильтры; Покрытие смен; Лента проверок; Страница проверки … +8 |
| `css/components/cil-table.css` | 621 | ТАБЛИЦА НЕДЕЛИ В СТИЛЕ CIL; Чек-лист CL и Расписание CL; ЧЕК-ЛИСТ CL: колонка «Когда» (Run / Stop; ДОЛГ ПРОВЕРОК И ПРОСТОЙ ЛИНИИ |
| `css/components/legend.css` | 26 | ЛЕГЕНДА ТАБЛИЦ |
| `css/components/tab-head.css` | 155 | ШАПКА ВКЛАДКИ: цветная плашка с шагами; ШАПКА СТРАНИЦЫ «Аврора»: Чек-лист CL, Ра |
| `css/components/photo-slider.css` | 177 | СЛАЙДЕР ФОТО СТАНДАРТА |
| `css/components/standard-view.css` | 363 | ОКНО ПРОСМОТРА СТАНДАРТА (#standardViewM |
| `css/views/quick-check.css` | 456 | БЫСТРАЯ ПРОВЕРКА (#quickCheckModal) — ме; ТОЧКА-МЕТКА: ОК / Не ОК вместо поля ввод |
| `css/components/validation.css` | 182 | ВАЛИДАЦИЯ НОВОГО СТАНДАРТА / E-PARAM |
| `css/components/std-comments.css` | 166 | КОММЕНТАРИИ К СТАНДАРТУ / E-PARAM |
| `css/components/std-ack.css` | 95 | ОЗНАКОМЛЕНИЕ СО СТАНДАРТОМ |
| `css/components/notify.css` | 118 | КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ |
| `css/components/check-run.css` | 499 | ОКНО ПРОВЕРКИ: список слева — стандарт с; Левая панель: шапка; Левая панель: пункты; Левая панель: сохранение; Правая часть: выбранный стандарт; CL при переходах: во время проверки окно … +1 |
| `css/brand.css` | 138 | БРЕНД BFT — Building the Future of Tobac; Шапка; Логотип; Смена, время и «круг смены»; Кнопка темы — шлем; Карточки и заголовки … +1 |

## Ключи localStorage

| Ключ | Где объявлен |
| --- | --- |
| `cl_active_tab` | js/router.js:163 |
| `cl_blocks_v1` | STORAGE_KEYS.blocks (js/core/state.js) |
| `cl_brandWorkshops_v1` | STORAGE_KEYS.brandWorkshops (js/core/state.js) |
| `cl_brands_v2` | STORAGE_KEYS.brands (js/core/state.js) |
| `cl_brands_ws_autoassign_v1` | js/data/catalog.js:317 |
| `cl_change_log_v1` | STORAGE_KEYS.changeLog (js/core/state.js) |
| `cl_cl_line` | js/views/cocl/cocl-pick.js:53 |
| `cl_cl_mode` | js/views/cl-checklist/cl-checklist.js:13 |
| `cl_cl_only_shift` | js/views/cl-checklist/cl-checklist.js:15 |
| `cl_cl_part` | js/views/cl-checklist/cl-checklist.js:14 |
| `cl_current_user` | js/data/user.js:8 |
| `cl_custom_triggers_v1` | STORAGE_KEYS.customTriggers (js/core/state.js) |
| `cl_dashboard_from` | js/views/dashboard.js:21 |
| `cl_dashboard_period` | js/views/dashboard.js:16 |
| `cl_dashboard_to` | js/views/dashboard.js:22 |
| `cl_dashboard_workshop` | js/views/dashboard.js:204 |
| `cl_editor_block` | js/core/modal.js:130 |
| `cl_editor_line` | js/router.js:118 |
| `cl_editor_mode` | js/router.js:103 |
| `cl_electronic_brandschedule_v1` | STORAGE_KEYS.electronicBrandSchedule (js/core/state.js) |
| `cl_electronic_params_v1` | STORAGE_KEYS.electronicParams (js/core/state.js) |
| `cl_electronic_shiftcfg_v1` | STORAGE_KEYS.electronicShiftCfg (js/core/state.js) |
| `cl_history_filters` | js/views/history/history.js:7 |
| `cl_history_v2` | STORAGE_KEYS.history (js/core/state.js) |
| `cl_lineBrands_v2` | STORAGE_KEYS.lineBrands (js/core/state.js) |
| `cl_lineMachines_v1` | STORAGE_KEYS.lineMachines (js/core/state.js) |
| `cl_line_brand_events_v1` | STORAGE_KEYS.lineBrandEvents (js/core/state.js) |
| `cl_line_downtime_v1` | STORAGE_KEYS.lineDowntime (js/core/state.js) |
| `cl_lines_v2` | STORAGE_KEYS.lines (js/core/state.js) |
| `cl_nodes_v2` | STORAGE_KEYS.nodes (js/core/state.js) |
| `cl_notify_read` | js/components/notify.js:12 |
| `cl_operators_v2` | STORAGE_KEYS.operators (js/core/state.js) |
| `cl_photos_broken_count` | js/views/settings/photos.js:200 |
| `cl_recent_lines` | js/views/editor/editor-core.js:12 |
| `cl_recent_standards` | js/views/editor/editor-core.js:46 |
| `cl_schedule_line` | js/views/schedule/schedule.js:35 |
| `cl_schedule_mode` | js/views/schedule/schedule.js:34 |
| `cl_schedule_part` | js/views/schedule/schedule.js:36 |
| `cl_schedule_weeks_v1` | STORAGE_KEYS.scheduleWeeks (js/core/state.js) |
| `cl_settings_panel` | js/views/settings/settings-shell.js:9 |
| `cl_shifts_v2` | STORAGE_KEYS.shifts (js/core/state.js) |
| `cl_sidebar_pinned` | js/router.js:175 |
| `cl_standards_v3` | STORAGE_KEYS.standards (js/core/state.js) |
| `cl_std_ack_v1` | STORAGE_KEYS.stdAck (js/core/state.js) |
| `cl_std_comments_v1` | STORAGE_KEYS.stdComments (js/core/state.js) |
| `cl_theme` | js/app.js:160 |
| `cl_tl_line` | js/views/toploss/toploss.js:10 |
| `cl_toploss_ws_split_v1` | js/data/catalog.js:244 |
| `cl_toplosses_v1` | STORAGE_KEYS.topLosses (js/core/state.js) |
| `cl_triggers_ws_v1` | js/data/catalog.js:381 |
| `cl_workshops_migration_smd_cell_named` | js/data/workshops.js:24 |
| `cl_workshops_v1` | STORAGE_KEYS.workshops (js/core/state.js) |
