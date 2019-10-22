import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import shortid from 'shortid';
import { FormattedMessage, injectIntl } from 'react-intl';
import LabPanelFieldSet from './LabPanelFieldSet';
import LabTestFieldSet from './LabTestFieldSet';
import { successToast, errorToast } from '../../utils/toast';
import {
  addTestPanelToDraft,
  removeTestPanelFromDraft,
  removeTestFromDraft,
  addTestToDraft,
  deleteDraftLabOrder,
} from '../../actions/draftLabOrderAction';
import '../../../css/grid.scss';
import './styles.scss';
import fetchLabOrders from '../../actions/labOrders/fetchLabOrders';
import fetchLabConcepts from '../../actions/labOrders/labConceptsAction';
import { setSelectedOrder } from '../../actions/orderAction';
import { getConceptShortName } from '../../utils/helpers';
import { CONCEPT_REP } from '../../utils/constants';

export class LabEntryForm extends PureComponent {
  static propTypes = {
    createOrderReducer: PropTypes.shape({
      status: PropTypes.objectOf(PropTypes.bool),
      errorMessage: PropTypes.string,
      labOrderData: PropTypes.object,
    }),
    draftLabOrders: PropTypes.arrayOf(PropTypes.any).isRequired,
    draftDrugOrders: PropTypes.arrayOf(PropTypes.any).isRequired,
    selectedLabPanels: PropTypes.arrayOf(PropTypes.any).isRequired,
    defaultTests: PropTypes.arrayOf(PropTypes.any).isRequired,
    selectedTests: PropTypes.arrayOf(PropTypes.any).isRequired,
    dispatch: PropTypes.func.isRequired,
    patient: PropTypes.shape({
      uuid: PropTypes.string,
    }),
    conceptsAsPanels: PropTypes.array,
    standAloneTests: PropTypes.array,
    orderables: PropTypes.arrayOf(PropTypes.object).isRequired,
    getLabOrderables: PropTypes.string.isRequired,
    backLink: PropTypes.string.isRequired,
  };

  static defaultProps = {
    createOrderReducer: {
      status: {},
      errorMessage: '',
    },
    patient: {
      uuid: '',
    },
    conceptsAsPanels: [],
    standAloneTests: [],
  };

  state = {
    categoryUUID: this.props.orderables[0].uuid || 0,
    categoryName: getConceptShortName(this.props.orderables[0], this.props.sessionReducer.locale),
    selectedPanelIds: [],
    selectedPanelTestIds: [],
  };

  componentDidMount() {
    if (this.state.categoryUUID) {
      this.props.dispatch(fetchLabConcepts(`${this.state.categoryUUID}?v=${CONCEPT_REP}`));
    }
  }

  componentWillReceiveProps(nextProps) {
    const {
      selectedLabPanels,
      defaultTests,
    } = nextProps;
    this.setState({
      selectedPanelIds: selectedLabPanels.map(panel => panel.uuid),
      selectedPanelTestIds: defaultTests.map(test => test.uuid),
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      status: { added, error },
      errorMessage,
      labOrderData,
    } = this.props.createOrderReducer;
    const { intl } = this.props;
    const orderCreatedMsg = intl.formatMessage({ id: "app.orders.create.success", defaultMessage: "Order Successfully Created" });

    if (added && labOrderData !== prevProps.createOrderReducer.labOrderData) {
      successToast(orderCreatedMsg);
      this.props.dispatch(fetchLabOrders(null, this.props.patient.uuid));
      this.props.dispatch(setSelectedOrder({
        currentOrderType: {},
        order: null,
        activity: null,
      }));
    }
    if (error) {
      errorToast(errorMessage);
    }
    if (this.state.categoryUUID !== prevState.categoryUUID) {
      this.props.dispatch(fetchLabConcepts(`${this.state.categoryUUID}?v=${CONCEPT_REP}`));
    }
  }

  handleTestSelection = (item, type) => {
    const {
      props: {
        draftLabOrders,
        dispatch,
      },
      state: {
        selectedPanelIds,
        selectedPanelTestIds,
      },
    } = this;
    const isSelected = !!draftLabOrders.filter(order => order.uuid === item.uuid).length;

    if ((type === 'panel')) {
      const isSelectedPanel = selectedPanelIds.includes(item.uuid);
      if (isSelectedPanel) {
        dispatch(removeTestPanelFromDraft(item));
      } else {
        dispatch(addTestPanelToDraft(item));
      }
    }
    if (type === 'single') {
      const isSelectedPanelTest = selectedPanelTestIds.includes(item.uuid);
      if (!isSelectedPanelTest && isSelected) dispatch(removeTestFromDraft(item));
      if (!isSelectedPanelTest && !isSelected)dispatch(addTestToDraft(item));
    }
  }

  discardTestsInDraft = (test, action) => {
    const { dispatch } = this.props;
    if (action === 'single') return dispatch(removeTestFromDraft(test));
    if (action === 'panel') return dispatch(removeTestPanelFromDraft(test));
    return dispatch(deleteDraftLabOrder());
  }

  showFieldSet = () => (
    <div>
      <LabPanelFieldSet
        labCategoryName={this.state.categoryName}
        handleTestSelection={this.handleTestSelection}
        panels={this.props.conceptsAsPanels}
        selectedPanelIds={this.state.selectedPanelIds}
        locale={this.props.sessionReducer.locale}
      />
      <LabTestFieldSet
        labCategoryName={this.state.categoryName}
        handleTestSelection={this.handleTestSelection}
        selectedTests={this.props.selectedTests}
        tests={this.props.standAloneTests}
        locale={this.props.sessionReducer.locale}
      />
    </div>
  );

  changeLabForm = (id, name) => {
    this.setState({
      categoryUUID: id,
      categoryName: name,
    });
  };

  render() {
    const {
      handleCancel, handleSubmit, renderPendingOrders, renderPastOrders,
      props: { orderables, getLabOrderables, backLink },
    } = this;
    const { draftDrugOrders, draftLabOrders } = this.props;
    const allDraftOrders = [...draftDrugOrders, ...draftLabOrders].length;
    return (
      <React.Fragment>
        {
          getLabOrderables ?
            <div className="lab-order-entry labfm">
              <h5>
                <FormattedMessage
                  id="app.orders.new"
                  defaultMessage="New Lab Order"
                  description="New Lab Order" />
              </h5>
              {/*<br />*/}
              <div className="lab-form-wrapper" >
                <div className="lab-category">
                  <ul>
                    {orderables.map(orderable => (
                      <li key={shortid.generate()}>
                        <a
                          className={this.state.categoryUUID === orderable.uuid ? 'active-category' : ''}
                          href="#"
                          id="category-button"
                          onClick={() => this.changeLabForm(orderable.uuid, orderable.display)}>
                          { getConceptShortName(orderable, this.props.sessionReducer.locale) }
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="order-form-wrapper">
                  <form className="lab-form simple-form-ui">{this.showFieldSet()}</form>
                </div>
              </div>
              <button className="cancel footerbutton" disabled={!!allDraftOrders} onClick={() => window.location.assign(backLink)}>Return</button>
            </div>
            :
            <p>No Lab Orderables was found</p>
        }
      </React.Fragment>
    );
  }
}

export const mapStateToProps = ({
  draftReducer: {
    draftLabOrders: {
      orders,
      selectedLabPanels,
      defaultTests,
      selectedTests,
    },
    draftDrugOrders,
  },
  labConceptsReducer: {
    conceptsAsPanels,
    standAloneTests,
  },
  fetchLabOrderReducer: { labOrders },
  patientReducer: { patient },
  careSettingReducer: { inpatientCareSetting },
  createOrderReducer,
  labOrderableReducer: { orderables },
  getLabOrderablesReducer: { getLabOrderables },
  openmrs: { session },
}) => ({
  draftLabOrders: orders,
  draftDrugOrders,
  conceptsAsPanels,
  standAloneTests,
  selectedLabPanels,
  defaultTests,
  selectedTests,
  labOrders,
  inpatientCareSetting,
  createOrderReducer,
  patient,
  orderables,
  getLabOrderables,
  sessionReducer: session,
});

export default connect(mapStateToProps)(injectIntl(LabEntryForm));
