import * as React from 'react'
import * as TeamsGen from '../../actions/teams-gen'
import * as RouteTreeGen from '../../actions/route-tree-gen'
import CustomTitle from './custom-title/container'
import {HeaderRightActions, HeaderTitle, SubHeader} from './nav-header/container'
import * as Kb from '../../common-adapters'
import * as Container from '../../util/container'
import * as Constants from '../../constants/teams'
import * as Types from '../../constants/types/teams'
import Team, {Sections} from '.'
import makeRows from './rows'

type TabsStateOwnProps = Container.RouteProps<{teamID: Types.TeamID}>
type OwnProps = TabsStateOwnProps & {
  selectedTab: Types.TabKey
  setSelectedTab: (tab: Types.TabKey) => void
}

// keep track during session
const lastSelectedTabs = {}

const mapStateToProps = (state: Container.TypedState, ownProps: OwnProps) => {
  const teamID = Container.getRouteProps(ownProps, 'teamID', '')
  if (!teamID) {
    throw new Error('There was a problem loading the team page, please report this error.')
  }

  const selectedTab = ownProps.selectedTab || 'members'

  return {
    _teamnameTodoRemove: Constants.getTeamDetails(state, teamID).teamname,
    selectedTab,
    teamDetails: Constants.getTeamDetails(state, teamID),
    teamID,
    yourOperations: Constants.getCanPerformByID(state, teamID),
    yourUsername: state.config.username,
  }
}

const mapDispatchToProps = (dispatch: Container.TypedDispatch, {setSelectedTab}: OwnProps) => ({
  _loadTeam: (teamname: string) => dispatch(TeamsGen.createGetDetails({teamname})),
  _setSelectedTab: (teamname: string, selectedTab: Types.TabKey) => {
    lastSelectedTabs[teamname] = selectedTab
    setSelectedTab(selectedTab)
  },
  onBack: () => dispatch(RouteTreeGen.createNavigateUp()),
})

const Connected = Container.compose(
  Container.connect(mapStateToProps, mapDispatchToProps, (stateProps, dispatchProps) => {
    const rows = makeRows(
      stateProps.teamDetails,
      stateProps.selectedTab,
      stateProps.yourUsername,
      stateProps.yourOperations
    )
    const sections: Sections = [
      ...(Container.isMobile ? [{data: [{type: 'header' as const}], key: 'header'}] : []),
      {data: rows, header: {type: 'tabs'}, key: 'body'},
    ]
    const customComponent = <CustomTitle teamname={stateProps._teamnameTodoRemove} />
    return {
      customComponent,
      load: () => dispatchProps._loadTeam(stateProps._teamnameTodoRemove),
      onBack: dispatchProps.onBack,
      rows,
      sections,
      selectedTab: stateProps.selectedTab,
      setSelectedTab: selectedTab =>
        dispatchProps._setSelectedTab(stateProps._teamnameTodoRemove, selectedTab),
      teamID: stateProps.teamID,
      teamname: stateProps._teamnameTodoRemove,
    }
  }),
  Kb.HeaderHoc
)(Team) as any

class TabsState extends React.PureComponent<TabsStateOwnProps, {selectedTab: Types.TabKey}> {
  static navigationOptions = (ownProps: TabsStateOwnProps) => ({
    headerExpandable: true,
    headerHideBorder: true,
    headerRightActions: Container.isMobile
      ? undefined
      : () => <HeaderRightActions teamID={Container.getRouteProps(ownProps, 'teamID', '')} />,
    headerTitle: Container.isMobile
      ? undefined
      : () => <HeaderTitle teamID={Container.getRouteProps(ownProps, 'teamID', '')} />,
    subHeader: Container.isMobile
      ? undefined
      : () => <SubHeader teamID={Container.getRouteProps(ownProps, 'teamID', '')} />,
  })
  state = {selectedTab: lastSelectedTabs[Container.getRouteProps(this.props, 'teamID', '')] || 'members'}
  private setSelectedTab = selectedTab => {
    this.setState({selectedTab})
  }
  componentDidUpdate(prevProps: TabsStateOwnProps) {
    const teamID = Container.getRouteProps(this.props, 'teamID', '')
    if (teamID !== Container.getRouteProps(prevProps, 'teamID', '')) {
      this.setSelectedTab(lastSelectedTabs[teamID] || 'members')
    }
  }
  render() {
    return (
      <Connected {...this.props} setSelectedTab={this.setSelectedTab} selectedTab={this.state.selectedTab} />
    )
  }
}

export default TabsState
