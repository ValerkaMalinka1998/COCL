# Карта проекта COCL

Сгенерировано 2026-10-17 по коммиту `eb24c2f Правки по итогам независимого ревью` скриптом `.claude/skills/cocl-session-close/scripts/gen_project_map.py`. Номера строк сдвигаются после правок — пересоздайте карту после крупных изменений.

app.js — 19377 строк, 485 функций · router.js — 170 строк · CSS — 13251 строк.
Как искать: найдите раздел по смыслу, затем `Grep` по имени функции внутри указанного диапазона строк.

## app.js — разделы и функции

| Строки | Раздел | Функции |
| --- | --- | --- |
| 1–24 | КОНСТАНТЫ И ХРАНИЛИЩЕ | — |
| 39–118 | СТРУКТУРА ПРОИЗВОДСТВА | — |
| 119–138 | ПРОВЕРКА CL — состояние вкладки | — |
| 139–247 | РЕДАКТОР: недавние линии и режим просмотра | `getRecentLines`, `addRecentLine` |
| 257–384 | СТЕК МОДАЛЬНЫХ ОКОН | `openModal`, `closeModal`, `bindModalBackdropClose`, `pluralizeStandards` |
| 385–921 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА | `getEparamNormRange`, `getEparamNormLabel`, `openEparamPage`, `closeEparamPage`, `renderEparamPage`, `renderEparamMainFields`, `renderEparamNorm`, `syncEparamRowsFromDom`, `renderEparamRelated`, `renderEparamExtra` |
| 932–1037 | КОММЕНТАРИЙ К ДЕАКТИВАЦИИ | `openDeactivationCommentModal`, `closeDeactivationCommentModal` |
| 1047–1187 | Модалка выбора потерь | `openTopLossPickerModal`, `closeTopLossPickerModal`, `getTopLossPickerWorkshop`, `renderTopLossPickerList`, `updateTopLossPickerCounter`, `applyTopLossPicker` |
| 1188–1310 | ВЫБОР ТРИГГЕРОВ CHANGE OVER — общая модалка | `openTriggerPickerModal`, `renderTriggerPickerList`, `updateTriggerPickerCounter`, `closeTriggerPickerModal`, `renderTriggerChipsEditable` |
| 1311–1367 | УТИЛИТЫ | `$`, `$$`, `showToast`, `nowStr`, `fmtDate`, `uid`, `escapeHtml`, `getPhotoPath`, `escapeAttr` |
| 1368–1519 | ФАБРИКА СТАНДАРТА — единая структура | `createEmptyStandard`, `normalizeAppliesTo`, `normalizeMeasurements`, `parseNorm` |
| 1520–1591 | ТИПЫ КОНТРОЛЯ — миграция на 3 канонических типа | `hasToleranceInMeasurements`, `migrateControlType`, `normalizeStandard` |
| 1592–1605 | ДОСТУП К ДАННЫМ | `load`, `save`, `getOperators`, `setOperators` |
| 1606–1758 | СТРУКТУРА ПРОИЗВОДСТВА — доступ к данным | `migrateToWorkshopsStructure`, `getWorkshops`, `setWorkshops`, `getWorkshop`, `getWorkshopName`, `workshopOptionsHtml`, `getArea`, `getBlock`, `getBlockForLine`, `getWorkshopIdForLine`, `getAllLinesWithContext` |
| 1759–1834 | ОБРАТНАЯ СОВМЕСТИМОСТЬ | `getLines`, `setLines`, `getBlocks`, `setBlocks`, `getAllAreas`, `getLineMachines` |
| 1835–2011 | TOP LOSSES — доступ к данным | `getTopLosses`, `getElectronicParams`, `setElectronicParams`, `makeElectronicParamId`, `normalizeElectronicParam`, `normalizeElectronicFrequency`, `getElectronicParamsForLine`, `getElectronicParamsForMachine`, `getElectronicBrandsForLine` |
| 2012–2032 | CL ELECTRONIC — расписание брендов | `getElectronicBrandSchedule`, `setElectronicBrandSchedule` |
| 2033–2111 | CL ELECTRONIC — модалка «Расписание брендов» | `openElectronicBrandSchedule`, `closeElectronicBrandSchedule`, `fillBrandSelectOptions` |
| 2112–2170 | Режим «По дням» — рендер строк | `renderEbsDailyRows` |
| 2171–2215 | Превью итогового расписания | `renderEbsPreview` |
| 2216–2509 | Обработчики модалки расписания брендов | `getElectronicBrandScheduleForLine`, `getElectronicBrandForDate`, `setElectronicBrandForDate`, `setElectronicBrandScheduleBulk`, `todayISO`, `addDaysISO`, `getWeekDays`, `getClWeekDays`, `getWeekLabel` |
| 2510–2577 | РАСПИСАНИЕ CL — ПОНЕДЕЛЬНЫЕ ПРАВКИ (оверрайды) | `getSchWeekStart`, `getScheduleWeeks`, `setScheduleWeeks`, `getScheduleWeekOverride`, `setScheduleWeekOverride`, `hasScheduleWeekOverride` |
| 2578–2687 | РАСПИСАНИЕ CL — ВЕРСИИ ШАБЛОНА | `getRowTemplateForWeek`, `getRowForWeek`, `setRowTemplateFrom`, `isShiftPast`, `fmtISODate` |
| 2688–2719 | CL ELECTRONIC — попадает ли параметр в конкретную дату/смену | `isElectronicParamDue` |
| 2720–2736 | CL ELECTRONIC — вкладка оператора | — |
| 2750–2850 | Чек-лист CL Electronic на сегодня | — |
| 2851–2989 | COCL: экран резюме после сохранения проверки | `renderCoclSummary` |
| 2990–3165 | БЫСТРАЯ ПРОВЕРКА — состояние и открытие | `openClCheckModal` |
| 3166–3176 | БЫСТРАЯ ПРОВЕРКА — закрытие | `closeQuickCheckModal` |
| 3177–3277 | БЫСТРАЯ ПРОВЕРКА — сохранение | `saveQuickCheck` |
| 3278–3659 | БЫСТРАЯ ПРОВЕРКА — хелперы | `getRowMeasurementBlock`, `renderQcPointsList`, `updateQcPointStatus`, `openCommentModalElec`, `openElecBrandOverrideDialog`, `setTopLosses`, `getAllLossItems`, `findLossById`, `makeLossId`, `getTopLossesForWorkshop`, `migrateTopLossesByWorkshop`, `makeCategoryId`, `setLineMachines`, `getMachinesForLine` … +22 |
| 3660–3894 | НАСТРОЙКИ: пользовательские триггеры Change Over | `renderCustomTriggersSettings`, `renderCtList`, `getCtOpenGroups`, `setCtOpenGroups`, `openCustomTriggerModal`, `updateCustomTriggerPartField`, `closeCustomTriggerModal`, `deleteCustomTrigger`, `getAvailableLines`, `getBrandsForLine` |
| 3895–3901 | ЧАСЫ | `tickClock` |
| 3902–4197 | ВКЛАДКА ПРОВЕРКА | `fillLinesForOperator`, `setCoclLine`, `clearCoclLine`, `getCurrentUser`, `fillBrandsForLine`, `updateBrandToOptions`, `renderCoclLineContext`, `renderCoclPartStep`, `updateCoclStepStates`, `openCoclTab`, `onTransitionTypeChange`, `renderMaterialChanges`, `getSelectedTriggers` |
| 4198–4472 | Показ стандарта в Change Over — логика «отличий точек» | `getEffectiveBrandBlock`, `brandBlocksDiffer`, `standardMatchesTriggers`, `updateChecklist`, `renderChecklist` |
| 4473–4696 | COCL: аккордеон — обработчики | `expandCoclItem`, `collapseCoclItem`, `bindCoclAccordionEvents`, `updateCoclItemStatus`, `updateCoclItemStatusFromPoints`, `updateProgress`, `updateCommentUrgency` |
| 4697–4712 | МОДАЛЬНОЕ ОКНО КОММЕНТАРИЯ | `openCommentModal` |
| 4713–4902 | ПРОСМОТР СТАНДАРТА — полноценная модалка | `controlTypeLabel`, `formatDateTime`, `openStandardView`, `renderStandardViewHeaderChips`, `renderStandardViewContent`, `closeStandardView` |
| 4903–5019 | ЛАЙТБОКС — просмотр фото | `openLightbox`, `updateLightbox`, `lightboxPrev`, `lightboxNext`, `closeLightbox`, `lightboxKeyHandler`, `closeCommentModal` |
| 5020–5186 | СОХРАНЕНИЕ ПРОВЕРКИ | `resetCheckForm` |
| 5187–5258 | ВКЛАДКА ИСТОРИЯ | `fillHistoryFilters`, `getFilteredHistory` |
| 5259–5643 | ИСТОРИЯ: вспомогательные для CL-режимов | `getHistoryModeText`, `formatClShift`, `renderHistory`, `renderHistoryPagination`, `changeHistoryPage`, `changeHistoryPageSize`, `viewRecord` |
| 5644–5834 | CL Electronic: сохранение проверки (кнопка «Зафиксировать») | `isOkNotOkRecord`, `renderRecordNorm`, `renderRecordAnswer`, `closeRecordModal` |
| 5835–5921 | ЭКСПОРТ: детали и CSV | `buildDetailsText`, `buildDetailsTextForCsv`, `exportToCsv` |
| 5922–6299 | ЭКСПОРТ В XLSX (ExcelJS) | `exportToXlsx`, `buildSheetChecks`, `buildSheetAnalytics` |
| 6300–6416 | XLSX: лист «Потери» — аналитика по TOP Losses | `buildSheetLosses` |
| 6417–6534 | XLSX: лист «CL» — аналитика по Чек-листу CL (мех + электро) | `buildSheetCL` |
| 6535–6556 | СКАЧИВАНИЕ ФАЙЛОВ | `downloadBlob` |
| 6557–6856 | ВКЛАДКА TOP LOSSES — ЭКРАН ВЫБОРА ПОТЕРЬ (Этап 3) | `fillTopLossTab`, `fillTopLossLines`, `countStandardsForLoss`, `renderTopLossCategories`, `toggleTopLossCategory`, `toggleTopLossSelection`, `updateTlSelectedCounter`, `resetTopLossSelection`, `buildTopLossChecklist`, `collectStandardsForLosses` |
| 6857–7649 | TOP LOSSES: рендер чек-листа — аккордеон | `renderTopLossChecklist`, `bindTopLossAccordionEvents`, `updateTlItemStatus`, `toggleAnswerBlock`, `updateItemAnsweredBadge`, `updateTlProgressFooter`, `startTopLossCheck`, `cancelTopLossCheck`, `updateTlChecklistProgress`, `saveTopLossCheck`, `renderTopLossSummary`, `backToTopLossList`, `checkAnotherTopLoss`, `backToTopLossSelect` |
| 7650–7663 | ВКЛАДКА НАСТРОЙКИ | `renderSettings` |
| 7664–9050 | ДАШБОРД | `renderDashboardWorkshopBar`, `renderDashboard`, `renderDashboardTertiaryBlock`, `renderDashboardDaysChart`, `renderDashboardMachineStats`, `renderDashboardWeekDynamics`, `renderDashboardTopLossesStats`, `renderDashboardClParamStats`, `renderDashboardTypesDonut`, `renderDashboardActions`, `renderDashboardAttention`, `renderDashboardMainBlock`, `renderDashboardSecondaryBlock`, `renderDashboardLineStats` … +5 |
| 9051–9097 | СЧЁТЧИКИ В SIDEBAR | `updateNavHistoryCounter`, `updateNavSettingsBadge`, `updateNavCounters` |
| 9098–9118 | КАРТОЧКА «ХРАНИЛИЩЕ ФОТО» | `renderPhotoStorageSettings` |
| 9119–9322 | ПРОВЕРКА ФОТОГРАФИЙ НА БИТЫЕ ССЫЛКИ | `checkPhotoExists`, `runPhotosCheck`, `renderPhotosCheckResult`, `buildPhotosCheckReport`, `closePhotosCheckModal` |
| 9323–9660 | БЛОКИ ЛИНИЙ — сворачиваемые группы Цех → Участок | `renderBlocksSettings`, `getBlOpenGroups`, `setBlOpenGroups`, `sanitizeCycleArray`, `getElectronicShiftConfig`, `setElectronicShiftConfig`, `daysSinceStart`, `getDayShiftForDate`, `getNightShiftForDate`, `getShiftsForDate`, `getCurrentShiftPeriod`, `getShiftForDate` |
| 9661–9795 | CL ELECTRONIC — карточка «График смен» | `renderElectronicShiftSettings`, `renderElectronicShiftPreview`, `pluralizeLines`, `parseCycleString`, `updateShiftPreviewTemporary`, `deleteBlock` |
| 9796–10055 | МОДАЛКА РЕДАКТИРОВАНИЯ БЛОКА | `openBlockModal`, `closeBlockModal`, `renderBlockModalLines`, `blockModalLineLabel`, `addBlockModalNewLine`, `confirmBlockModalRemovedLines`, `openAreaLinesModal`, `openNewBlockModal` |
| 10056–10460 | МАШИНЫ ДЛЯ ЛИНИЙ — компактные строки + аккордеон по блокам | `getLmOpenBlocks`, `setLmOpenBlocks`, `renderLineMachinesSettings`, `renderLmLineRow`, `collectAllLmGroupIds`, `updateLmToggleAllBtnMultiLevel`, `applyLmSearch` |
| 10461–10860 | TOP LOSSES — категории (аккордеон + inline-потери) | `getTlOpenCats`, `setTlOpenCats`, `renderTopLossesSettings`, `getTlOpenWorkshops`, `setTlOpenWorkshops`, `updateTlCatToggleAllBtn`, `applyTlCatSearch`, `pluralizeLosses`, `pluralizeMachines`, `removeMachineFromLine` |
| 10861–10933 | МОДАЛКА СПИСКА МАШИН ЛИНИИ | `openMachinesListModal`, `closeMachinesListModal`, `renderMachinesListContent` |
| 10934–10952 | МОДАЛКА МАШИНЫ | `openMachineModal` |
| 10953–11100 | БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра) | `openQuickAddMachineModal`, `closeQuickAddMachineModal`, `closeMachineModal` |
| 11101–11220 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам | `getBrandsOpenGroups`, `setBrandsOpenGroups`, `renderBrandsSettings`, `brandRowHtml`, `highlightBrandName` |
| 11221–11455 | РЕДАКТИРОВАНИЕ БРЕНДА | `openEditBrandModal`, `closeEditBrandModal`, `renderLinesCheckboxesGroup`, `collectSelectedLines`, `openAddBrandModal`, `closeAddBrandModal` |
| 11456–11668 | ОПЕРАТОРЫ — строки + inline + пагинация | `renderOperatorsSettings`, `highlightOperatorName`, `renderOperatorsPagination`, `changeOperatorsPage`, `sortOperatorsRus`, `openAddOperatorModal`, `closeAddOperatorModal` |
| 11669–11803 | TOP LOSSES — модалки: потеря | `closeTopLossItemModal`, `deleteTopLossItem`, `deleteOperator`, `deleteBrand` |
| 11809–12295 | БРЕНДЫ ДЛЯ ЛИНИЙ — аккордеон по блокам + строки + поиск | `getLbOpenBlocks`, `setLbOpenBlocks`, `renderLineBrandsSettings`, `renderLbLineRow`, `collectAllLbGroupIds`, `updateLbToggleAllBtnMultiLevel`, `applyLbSearch`, `pluralizeBrandsShort`, `openLineBrandsModal`, `closeLineBrandsModal`, `renderLineBrandsChecklist` |
| 12296–12403 | ХРАНИЛИЩЕ ФОТО — обработчики | `fallbackCopy` |
| 12404–12447 | ИНИЦИАЛИЗАЦИЯ | `init` |
| 12448–12474 | Переключатель темы (light / dark) | — |
| 12475–12520 | ИМПОРТ/ЭКСПОРТ: ШАБЛОНЫ | — |
| 12521–12810 | TOP LOSSES — шаблон и импорт Excel | `parseTopLossesExcel`, `parseOperatorsExcel`, `showImportReport` |
| 12811–12940 | ИМПОРТ/ЭКСПОРТ БРЕНДОВ | `parseBrandsExcel` |
| 12941–13210 | ЭКСПОРТ СТАНДАРТОВ ЛИНИИ В EXCEL | — |
| 13211–13271 | COCL: Сворачивание верхней части и показ чек-листа | `buildChecklistView`, `editChecklistConditions` |
| 13272–13574 | ПАРСЕР EXCEL — ШАБЛОН OPL (v3: два листа, точки отдельно) | `parseStandardsExcelV3` |
| 13575–13935 | ВЫБОР ЛИНИИ — компактный dropdown (#linePickerModal) | `resetLinePickerState`, `openLinePickerModal`, `closeLinePickerModal`, `renderLinePickerModal`, `renderLinePickerStart`, `renderLinePickerWorkshopView`, `renderLinePickerRecent`, `renderLinePickerBreadcrumbs`, `renderLinePickerAreaTiles`, `renderLinePickerBlockTiles`, `renderLinePickerRowsForArea`, `renderLinePickerRowsForBlock`, `renderLinePickerSearch`, `bindLinePickerEvents` |
| 13936–13987 | Выбор линии | `selectLine` |
| 13988–14061 | Обновление UI: чип + крошки + счётчики | `updateEditorLineContext`, `buildEditorCrumbs` |
| 14062–14097 | Счётчики Maker / Packer | `updatePartCounters` |
| 14098–14129 | Переключатель режима внутри панели | `switchEditorModeInline` |
| 14130–14157 | Сброс линии | `clearEditorLine` |
| 14158–14227 | Обработчики | `bindPartSwitchHandlers` |
| 14242–14255 | РЕДАКТОР: парсинг нормы (для колонок) | `formatEditorDate` |
| 14256–14344 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация | `getFilteredMechStandards` |
| 14345–14666 | МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы | `refreshEditorMechTable`, `lineContextCacheForLine`, `renderMechTypeChips`, `updateMechSelectionUI`, `renderEditorMechPagination` |
| 14667–14725 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация | `getFilteredElecParams` |
| 14726–14998 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы | `refreshEditorElecTable`, `updateElecSelectionUI`, `renderEditorElecPagination` |
| 14999–15027 | РЕДАКТОР: обновление сброса фильтров | `resetMechFilters`, `resetElecFilters` |
| 15028–15065 | РЕДАКТОР: обработчики фильтров и поиска | — |
| 15066–15112 | РЕДАКТОР: кнопки «Создать» | — |
| 15113–15319 | ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: экспорт / импорт / шаблон | `serializeValuesByBrand`, `parseValuesByBrand`, `editorElecDownloadTemplate`, `editorElecExport`, `parseElectronicParamsExcel` |
| 15320–15397 | РЕДАКТОР: заполнение фильтров | `fillEditorFilters` |
| 15398–15431 | РЕДАКТОР: переключение активности стандарта | `toggleStandardActive` |
| 15432–15460 | РЕДАКТОР: копирование стандарта | `copyStandardNew` |
| 15461–15478 | РЕДАКТОР: удаление стандарта | `deleteStandardNew` |
| 15479–15547 | РЕДАКТОР: обработчики шапки (мех. режим) | — |
| 15548–15665 | РЕДАКТОР: скачать шаблон OPL для линии | `editorDownloadTemplate` |
| 15666–15789 | РЕДАКТОР: экспорт стандартов линии в XLSX | `editorExportLine` |
| 15790–16214 | РАСПИСАНИЕ CL — вкладка технолога | `openScheduleTab`, `updateSchLinePill`, `updateSchPanelCount`, `isSchRowMember`, `getFilteredScheduleRows`, `updateSchMatrixCounters`, `fillSchMachineFilter`, `renderScheduleMatrix` |
| 16215–16815 | РАСПИСАНИЕ CL — время проверки (timeWindows) | `getTimeWindowShift`, `openTimeWindowsModal`, `closeTimeWindowsModal`, `renderTimeWindowsList`, `addTimeWindow`, `saveTimeWindows`, `fmtShortDate`, `getSchRowFreq`, `getClRowFreq`, `getCheckedStandardIdsForWeek`, `ensureSchDraft`, `renderScheduleRow`, `isSchReadOnly`, `removeRowFromSchedule` … +6 |
| 16816–17232 | РАСПИСАНИЕ CL — модалка добавления стандартов | `openScheduleAddStandardsModal`, `closeScheduleAddStandardsModal`, `renderSchAddList`, `toggleSchAddItem`, `updateSchAddCounter`, `updateSchAddCheckAllState`, `confirmScheduleAddStandards`, `selectLine` |
| 17247–17939 | ПРОВЕРКА CL — логика | `openClCheckTab`, `updateClLinePill`, `updateClPartSwitchVisibility`, `updateClCheckButtons`, `updateClContext`, `openClBrandOverrideDialog`, `updateClPanelCount`, `renderClMatrix`, `bindClWeekNav`, `renderClRow`, `renderClRowNorm`, `fmtNum`, `findExistingCheck`, `bindClCells` … +4 |
| 17940–18003 | ПРОВЕРКА CL — обработчики | — |
| 18004–18051 | ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full) — открытие и заполнение | `openStandardFullView` |
| 18052–18234 | СОЗДАНИЕ МЕХАНИЧЕСКОГО СТАНДАРТА | `openStandardCreatePage`, `closeStandardFullView`, `renderStandardFullView`, `renderSvFullCrumbs` |
| 18235–18370 | Основная информация — поля | `renderSvMainFields`, `svFieldRow`, `formatSvDuration` |
| 18371–18469 | Точки контроля и описание — блоки | `renderSvContentBlocks`, `buildSvContentBlocksHtml`, `svContentBlockEditable` |
| 18470–18550 | Контроль правильности — таблица брендов × точек | `renderSvControlSection`, `renderReadonlyBrandsTable`, `renderSvBrandBlocksView` |
| 18551–18727 | Таблица брендов × точек — рендер в новом экране | `renderSvBrandsTable`, `getSvTableState`, `renderSvBrandsTableFromState`, `bindSvControlEvents` |
| 18728–18856 | Фото | `renderSvFullPhotos` |
| 18857–18893 | Связанные объекты | `renderSvFullRelated` |
| 18894–19091 | Дополнительная информация (Применять к, Триггеры, Top Losses) | `renderSvFullExtra` |
| 19092–19136 | Заглушки для таблиц вкладок | `renderSvAckTable`, `renderSvHistoryTable`, `renderSvCommentsTable` |
| 19137–19160 | Переключение вкладок внутри просмотра | `switchSvFullTab` |
| 19161–19239 | Обработчики кнопок | — |
| 19240–19377 | СОХРАНЕНИЕ СТАНДАРТА ИЗ ПОЛНОЭКРАННОГО ПРОСМОТРА | — |

## js/router.js

| Строки | Раздел | Функции |
| --- | --- | --- |
| 1–170 | РОУТЕР — навигация между вкладками с сохранением в URL | `switchTab`, `initRouter` |

## CSS — блоки

Точка входа `style.css` (@import + anti-flash + печать). Переменные темы — `css/base.css`.

| Файл | Строки | Блок |
| --- | --- | --- |
| css/layout.css | 228–306 | Иконки и текст |
| css/components.css | 601–680 | Модалка в режиме "suspend" (родитель временно скрыт) |
| css/components.css | 762–1003 | COCL: панель условий проверки |
| css/components.css | 1004–1082 | Селектор типа перехода — чипы |
| css/components.css | 1083–1173 | Компактные чекбоксы типов (Редактор) |
| css/components.css | 1268–1660 | БРЕНДЫ ДЛЯ ЛИНИЙ — строки + аккордеон по блокам |
| css/components.css | 1801–1950 | Чек-лист: сетка точек замера |
| css/components.css | 1951–2028 | Карточка «Хранилище фото» |
| css/components.css | 2029–2150 | ДАШБОРД: карточки-счётчики |
| css/components.css | 2151–2308 | ДАШБОРД: двухколоночный layout + виджеты |
| css/components.css | 2309–2405 | ДАШБОРД: бары по линиям и операторам |
| css/components.css | 2406–2507 | ДАШБОРД: столбики по дням |
| css/components.css | 2508–2588 | ДАШБОРД: круговая по типам |
| css/components.css | 2641–2727 | ДАШБОРД: «Требует внимания» |
| css/components.css | 2728–2827 | Результат проверки фото |
| css/components.css | 2828–2928 | Фотографии в форме стандарта |
| css/components.css | 2940–3136 | Чипы в шапке модалки просмотра стандарта |
| css/components.css | 3137–3248 | ЛАЙТБОКС |
| css/components.css | 3348–3534 | Блоки линий — сворачиваемые группы |
| css/components.css | 3566–3869 | TOP LOSSES — категории (аккордеон + inline-потери) |
| css/components.css | 3870–4260 | МАШИНЫ ДЛЯ ЛИНИЙ — строки + аккордеон по блокам |
| css/components.css | 4505–4665 | ТАБЛИЦА СТАНДАРТОВ |
| css/components.css | 4702–4793 | Комментарий к деактивации |
| css/components.css | 4849–4918 | Кнопки «иконка + текст» |
| css/components.css | 4919–5192 | TOP LOSSES — вкладка (экран выбора) |
| css/components.css | 5213–5378 | TOP LOSSES — экран резюме (Этап 4.2) |
| css/components.css | 5484–5656 | TOP LOSSES: список стандартов с опциональной оценкой |
| css/components.css | 5701–5907 | TOP LOSSES: новое резюме (визуальное) |
| css/components.css | 6247–6334 | CL ELECTRONIC: дерево в редакторе |
| css/components.css | 6335–6457 | CL ELECTRONIC: расписание брендов |
| css/components.css | 6458–6640 | CL ELECTRONIC: вкладка оператора |
| css/components.css | 6641–6727 | CL ELECTRONIC: тулбар над матрицей недели |
| css/components.css | 6728–6995 | CL ELECTRONIC: матрица недели |
| css/components.css | 6996–7102 | CL Electronic: строка ответа и статус |
| css/components.css | 7192–7403 | CL Electronic: модалка быстрой проверки (из матрицы) |
| css/components.css | 7473–7565 | ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам |
| css/components.css | 7566–7647 | ОПЕРАТОРЫ — строки + inline + пагинация |
| css/components.css | 7728–7926 | Точки замера: таблица по брендам |
| css/components.css | 7927–8004 | Модалка просмотра стандарта: блоки брендов |
| css/components.css | 8050–8250 | COCL: аккордеон чек-листа у оператора |
| css/components.css | 8296–8366 | TOP Losses: аккордеон (как в COCL) |
| css/components.css | 8367–8459 | Модалка выбора потерь |
| css/components.css | 8583–8666 | РЕДАКТОР: единая панель + фильтры + таблица |
| css/components.css | 8748–9009 | РЕДАКТОР: таблица стандартов |
| css/components.css | 9235–9311 | РЕДАКТОР: контекстная строка (чип + переключатель + счётчики) |
| css/components.css | 9363–9674 | МОДАЛКА-ВЫБОР ЛИНИИ (компактный dropdown) |
| css/components.css | 9675–9748 | РЕДАКТОР: переключатель по части линии |
| css/components.css | 9749–9846 | РАСПИСАНИЕ CL: матрица (с инфо-колонками) |
| css/components.css | 9847–9987 | Тулбар над матрицей: фильтр+поиск слева, счётчики+легенда справа |
| css/components.css | 10016–10140 | Шапка: grid 2 ряда, 8 инфо + 14 смен |
| css/components.css | 10357–10508 | РАСПИСАНИЕ CL: модалка добавления стандартов |
| css/components.css | 10509–10618 | РАСПИСАНИЕ CL: улучшения строк |
| css/components.css | 10646–10728 | ПРОВЕРКА CL: контекстная строка |
| css/components.css | 10729–11058 | ПРОВЕРКА CL: расширенная сетка с инфо-колонками |
| css/components.css | 11059–11161 | БЫСТРАЯ ПРОВЕРКА: точки замера |
| css/components.css | 11162–11254 | БЫСТРАЯ ПРОВЕРКА: блок «Как проверять» |
| css/components.css | 11301–11487 | МОДАЛКА ВРЕМЕНИ ПРОВЕРКИ |
| css/components.css | 11491–11675 | Шапка |
| css/components.css | 11676–11758 | Вкладки внутри |
| css/components.css | 11836–11964 | Поля «Основная информация» |
| css/components.css | 12179–12291 | Блоки «Точки контроля» — свёрнутые секции |
| css/components.css | 12391–12461 | ПОЛНОЭКРАННЫЙ СТАНДАРТ: редактор фото |
| css/components.css | 12506–12603 | СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА |

## Ключи localStorage

| Ключ | Где объявлен |
| --- | --- |
| `cl_active_tab` | app.js:12437 |
| `cl_bl_open_groups` | app.js:9538 |
| `cl_blocks_v1` | STORAGE_KEYS.blocks |
| `cl_brandWorkshops_v1` | STORAGE_KEYS.brandWorkshops |
| `cl_brands_open_ws` | app.js:11105 |
| `cl_brands_v2` | STORAGE_KEYS.brands |
| `cl_brands_ws_autoassign_v1` | app.js:3563 |
| `cl_cl_line` | app.js:17224 |
| `cl_cl_mode` | app.js:17252 |
| `cl_cl_part` | app.js:17253 |
| `cl_ct_open_groups` | app.js:3748 |
| `cl_current_user` | app.js:3944 |
| `cl_custom_triggers_v1` | STORAGE_KEYS.customTriggers |
| `cl_dashboard_workshop` | app.js:7686 |
| `cl_editor_block` | app.js:379 |
| `cl_editor_line` | app.js:380 |
| `cl_editor_mode` | app.js:14117 |
| `cl_elec_subtab` | app.js:2741 |
| `cl_electronic_brandschedule_v1` | STORAGE_KEYS.electronicBrandSchedule |
| `cl_electronic_params_v1` | STORAGE_KEYS.electronicParams |
| `cl_electronic_shiftcfg_v1` | STORAGE_KEYS.electronicShiftCfg |
| `cl_history_v2` | STORAGE_KEYS.history |
| `cl_lb_open_blocks` | app.js:11813 |
| `cl_lineBrands_v2` | STORAGE_KEYS.lineBrands |
| `cl_lineMachines_v1` | STORAGE_KEYS.lineMachines |
| `cl_lines_v2` | STORAGE_KEYS.lines |
| `cl_lm_open_blocks` | app.js:10060 |
| `cl_nodes_v2` | STORAGE_KEYS.nodes |
| `cl_operators_v2` | STORAGE_KEYS.operators |
| `cl_photos_broken_count` | app.js:8827 |
| `cl_recent_lines` | app.js:143 |
| `cl_schedule_line` | app.js:15817 |
| `cl_schedule_mode` | app.js:15816 |
| `cl_schedule_part` | app.js:15818 |
| `cl_schedule_weeks_v1` | STORAGE_KEYS.scheduleWeeks |
| `cl_shifts_v2` | STORAGE_KEYS.shifts |
| `cl_sidebar_pinned` | js/router.js:113 |
| `cl_standards_v3` | STORAGE_KEYS.standards |
| `cl_theme` | app.js:12452 |
| `cl_tl_open_cats` | app.js:10465 |
| `cl_tl_open_ws` | app.js:10733 |
| `cl_toploss_ws_split_v1` | app.js:3469 |
| `cl_toplosses_v1` | STORAGE_KEYS.topLosses |
| `cl_triggers_ws_v1` | app.js:3627 |
| `cl_workshops_migration_smd_cell_named` | app.js:1622 |
| `cl_workshops_v1` | STORAGE_KEYS.workshops |
