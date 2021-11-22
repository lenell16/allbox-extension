import React, { useReducer, useEffect, useState } from 'react';
import * as R from 'ramda';
import { Checkbox } from 'baseui/checkbox';
import { StyledLink as Link } from 'baseui/link';
import { TableBuilder, TableBuilderColumn } from 'baseui/table-semantic';
import { ButtonGroup } from 'baseui/button-group';
import { Button } from 'baseui/button';
import { useQuery, useMutation } from 'react-query';

const keyById = R.indexBy(R.prop('_id'));
const intersectionByUrl = R.innerJoin(R.eqProps('url'));

function reducer(state, action) {
  switch (action.type) {
    case 'toggleAll':
      return {
        ...state,
        selectedTabs: action.payload.noneSelected
          ? action.payload.selectedIds
          : [],
      };
    case 'toggle':
      return {
        ...state,
        selectedTabs: action.payload.checked
          ? R.union(state.selectedTabs, action.payload.ids)
          : R.difference(state.selectedTabs, action.payload.ids),
      };
    case 'load':
      return {
        ...state,
        tabs: keyById(action.payload),
      };
    case 'updateTabs':
      const ids = action.payload.map(({ _id }) => _id);
      const updatedTabs = keyById(action.payload);
      return {
        ...state,
        selectedTabs: R.difference(state.selectedTabs, ids),
        tabs: R.mergeDeepLeft(updatedTabs, state.tabs),
      };
    default:
      throw new Error();
  }
}

const fetchTabs = () =>
  fetch('http://localhost:5000/tabs').then((res) => res.json());
const updateTabs = (body) =>
  fetch('http://localhost:5000/tabs', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json());

function App() {
  const { status, data, error } = useQuery('tabs', fetchTabs, {
    refetchOnWindowFocus: false,
  });
  const [state, dispatch] = useReducer(reducer, { tabs: {}, selectedTabs: [] });
  const [mutateTabs] = useMutation(updateTabs, {
    onSuccess: (data) => {
      dispatch({ type: 'updateTabs', payload: data });
    },
  });

  useEffect(() => {
    if (status === 'success') {
      dispatch({ type: 'load', payload: data });
    }
  }, [status, data]);

  const shownTabs = R.pipe(
    R.values,
    R.filter((tab) => !tab.deleted),
    R.filter((tab) => !tab.archived),
    R.sortWith([R.ascend(R.prop('url'))]),
    R.take(40)
  )(state.tabs);

  // useEffect(() => {
  //   chrome.commands.onCommand.addListener((command) => {
  //     if (command === 'delete-selected') {
  //       chrome.tabs.query({ highlighted: true }, (tabs) => {
  //         const tabsToDelete = tab.reduce((acc, curr) => {
  //           const shown = R.find(R.propEq('url', curr.url))(shownTabs);
  //           if (shown) {
  //             return acc.concat({ tabId: curr.id, _id: shown._id });
  //           }
  //         }, []);
  //         console.log(tabsToDelete);
  //       });
  //     }
  //   });
  // }, []);
  // useEffect(() => {
  //   const shownButNotOpenTabs = R.difference(shownTabs, openTabs);
  //   if (!R.isEmpty(shownButNotOpenTabs) ) {
  //     const queryUrls = shownButNotOpenTabs.map(R.prop('url'));
  // chrome.tabs.getAllInWindow((tabs) => {
  //   const tabUrls = tabs.map(R.prop('url'));
  //   shownTabs
  //     .filter((tab) => tabUrls.includes(tab.url))
  //     .map(R.prop('_id'))
  //     .forEach((_id) =>
  //       dispatch({ type: 'toggleOne', payload: { _id, checked: true } })
  //     );
  // });
  // }
  // }, [shownTabs]);

  // const loadTabs = event => {
  //   const reader = new FileReader();
  //   reader.onload = loadedEvent => {
  //     const tabs = JSON.parse(loadedEvent.target.result);
  //     dispatch({type: "load", payload: tabs});
  //   };
  //   reader.readAsText(event.target.files[0]);
  // };

  const hasAny = Boolean(shownTabs.length);
  const hasAll =
    hasAny && shownTabs.every((x) => state.selectedTabs.includes(x._id));
  const hasSome =
    hasAny && shownTabs.some((x) => state.selectedTabs.includes(x._id));

  function archiveTabsByIds(ids) {
    mutateTabs({ ids, update: { archived: true } });
  }
  function deleteTabsByIds(ids) {
    mutateTabs({ ids, update: { deleted: true } });
  }

  function toggleOne(event) {
    const { name: _id, checked } = event.currentTarget;
    dispatch({ type: 'toggle', payload: { ids: [_id], checked } });
  }
  function toggleAll() {
    dispatch({
      type: 'toggle',
      payload: {
        checked: !hasAll,
        ids: shownTabs.map(({ _id }) => _id),
      },
    });
  }

  function deleteOne(event) {
    const { name: _id, checked } = event.currentTarget;
    mutateTabs({ ids: [_id], update: { deleted: checked } });
  }
  function deleteSelected() {
    deleteTabsByIds(state.selectedTabs);
  }

  function archiveOne(event) {
    const { name: _id, checked } = event.currentTarget;
    mutateTabs({ ids: [_id], update: { archived: checked } });
  }
  function archiveSelected() {
    archiveTabsByIds(state.selectedTabs);
  }

  function archiveOpen() {
    const selectedTabs = R.innerJoin(R.flip(R.propEq('_id')))(
      shownTabs,
      state.selectedTabs
    );
    const queryUrls = selectedTabs.map(R.prop('url'));

    chrome.tabs.query({ url: queryUrls }, (openTabs) => {
      const mongoIds = R.pipe(intersectionByUrl, R.map(R.prop('_id')))(
        selectedTabs,
        openTabs
      );
      const tabIds = R.pipe(intersectionByUrl, R.map(R.prop('id')))(
        openTabs,
        selectedTabs
      );

      archiveTabsByIds(mongoIds);
      chrome.tabs.remove(tabIds);
    });
  }

  function openSelected() {
    state.selectedTabs
      .map((_id) => state.tabs[_id].url)
      .forEach((url) => chrome.tabs.create({ url, active: false }));
  }

  return status === 'loading' ? (
    <span>Loading...</span>
  ) : status === 'error' ? (
    <span>Error: {error.message}</span>
  ) : (
    <>
      <ButtonGroup>
        <Button onClick={openSelected}>Open</Button>
        <Button onClick={archiveSelected}>Archive</Button>
        <Button onClick={deleteSelected}>Delete</Button>
        {hasSome && <Button onClick={archiveOpen}>Archive Open</Button>}
      </ButtonGroup>
      <TableBuilder data={shownTabs}>
        <TableBuilderColumn
          overrides={{
            TableHeadCell: { style: { width: '1%' } },
            TableBodyCell: { style: { width: '1%' } },
          }}
          header={
            <Checkbox
              checked={hasAll}
              isIndeterminate={!hasAll && hasSome}
              onChange={toggleAll}
            />
          }
        >
          {(row) => (
            <Checkbox
              name={row._id}
              checked={state.selectedTabs.includes(row._id)}
              onChange={toggleOne}
            />
          )}
        </TableBuilderColumn>
        <TableBuilderColumn header="Archived">
          {(row) => (
            <Checkbox
              name={row._id}
              checked={row.archived}
              onChange={archiveOne}
            />
          )}
        </TableBuilderColumn>
        <TableBuilderColumn header="Deleted">
          {(row) => (
            <Checkbox
              name={row._id}
              checked={row.deleted}
              onChange={deleteOne}
            />
          )}
        </TableBuilderColumn>
        <TableBuilderColumn header="Link">
          {(row) => <Link href={row.url}>{row.title}</Link>}
        </TableBuilderColumn>
      </TableBuilder>
    </>
  );
}

export default App;
