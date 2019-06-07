import React, { Component, ReactNode } from "react";

import { grpc } from "@improbable-eng/grpc-web";
import { Code } from "../../typeScript/grpc";

// Generated STUB Imports
import { ConfigurationService } from "../../protos/config/config_pb_service";
import { CommandRequest } from "../../protos/config/config_pb";

// MaterialUI Imports
import { withStyles, Theme, createStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import red from "@material-ui/core/colors/red";
import Button from "@material-ui/core/Button";
import Snackbar from "@material-ui/core/Snackbar";
import SnackbarContent from "@material-ui/core/SnackbarContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import green from "@material-ui/core/colors/green";

const styles = (theme: Theme): any =>
  createStyles({
    root: {
      display: "flex",
      alignItems: "center"
    },
    wrapper: {
      margin: theme.spacing.unit,
      position: "relative"
    },
    buttonStop: {
      fontSize: "1.4rem",
      backgroundColor: red[500],
      "&:hover": {
        backgroundColor: red[700]
      }
    },
    buttonStart: {
      fontSize: "1.4rem",
      backgroundColor: green[500],
      "&:hover": {
        backgroundColor: green[700]
      }
    },
    fabProgress: {
      fontSize: "1.4rem",
      color: green[500],
      position: "absolute",
      top: -6,
      left: -6,
      zIndex: 1
    },
    buttonProgress: {
      fontSize: "1.4rem",
      color: green[500],
      position: "absolute",
      top: "50%",
      left: "50%",
      marginTop: -12,
      marginLeft: -12
    },
    snackbarSuccess: {
      fontSize: "1.8rem",
      backgroundColor: green[600]
    },
    snackbarError: {
      fontSize: "1.8rem",
      backgroundColor: theme.palette.error.dark
    }
  });

interface IProps {
  classes: any;
  network: any;
  daemonEndpoint: string;
}

interface IState {
  loading: boolean;
  daemonRunning: boolean;
  showAlert: boolean;
  alertText: string;
  alertVariant: string;
}

class StartStopDaemon extends Component<IProps, IState> {
  public userAddress: string = "";

  public state = {
    loading: false,
    daemonRunning: true,
    showAlert: false,
    alertText: "",
    alertVariant: "success"
  };

  private handleButtonClick = async (): Promise<any> => {
    this.setState({ loading: true });
    const { network, daemonEndpoint } = this.props;
    const { daemonRunning } = this.state;
    let commandRequest: CommandRequest = new CommandRequest();

    if (this.userAddress === "") {
      this.userAddress = await network.getAccount();
    }
    let currentBlockNumber: number = await network.getCurrentBlockNumber();
    let command = daemonRunning ? 1 : 0; // 1 - Stop Request, 0 - Start Request

    commandRequest.setUserAddress(this.userAddress);
    commandRequest.setCurrentBlock(currentBlockNumber);
    commandRequest.setCommand(command);

    let msg: string = network.composeSHA3Message(
      ["string", "uint256", "address"],
      ["_Request_Read", currentBlockNumber, this.userAddress]
    );

    network.eth
      .personal_sign(msg, this.userAddress)
      .then((signed: any): void => {
        let signature = network.buffSignature(signed);
        commandRequest.setSignature(signature);
        try {
          grpc.invoke(ConfigurationService.StopProcessingRequests, {
            request: commandRequest,
            host: daemonEndpoint,
            onMessage: (): void => {},
            onEnd: (code: Code, msg: string | undefined): void => {
              if (code === 0 && daemonRunning) {
                this.setState({
                  loading: false,
                  daemonRunning: false,
                  showAlert: true,
                  alertText: "Daemons has stopped receiving any requests",
                  alertVariant: "success"
                });
              } else if (code === 0 && !daemonRunning) {
                this.setState({
                  loading: false,
                  daemonRunning: true,
                  showAlert: true,
                  alertText: "Daemon starts accepting requests",
                  alertVariant: "success"
                });
              } else if (code === 2) {
                this.setState({
                  loading: false,
                  showAlert: true,
                  alertText: "Unable to process request. Please try later",
                  alertVariant: "error"
                });
              }
            }
          });
        } catch (err) {
          this.setState({
            showAlert: true,
            alertText: "Unable to process request. Please try later",
            alertVariant: "error"
          });
        }
      })
      .catch((err: any): void => {
        this.setState({
          showAlert: true,
          alertText: "Unable to process request. Please try later",
          alertVariant: "error"
        });
      });
  };

  private handleAlertClose = (): void => {
    this.setState({ showAlert: false });
  };

  public render(): ReactNode {
    const { classes } = this.props;
    const {
      loading,
      daemonRunning,
      showAlert,
      alertText,
      alertVariant
    } = this.state;
    return (
      <div className={classes.root}>
        <div className={classes.wrapper}>
          <Button
            variant="contained"
            color="primary"
            className={daemonRunning ? classes.buttonStop : classes.buttonStart}
            disabled={loading}
            onClick={this.handleButtonClick}
          >
            {daemonRunning ? "Stop Daemon" : "Start Daemon"}
          </Button>
          {loading && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </div>
        <Snackbar
          className={classes.snackbar}
          classes={{
            root: classes.snackbar
          }}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={showAlert}
          onClose={this.handleAlertClose}
          ContentProps={{
            "aria-describedby": "message-id"
          }}
        >
          <SnackbarContent
            className={classes[`snackbar_${alertVariant}`]}
            action={[
              <IconButton
                key="close"
                aria-label="Close"
                color="inherit"
                className={classes.close}
                onClick={this.handleAlertClose}
              >
                <CloseIcon className={classes.icon} />
              </IconButton>
            ]}
            message={<span id="message-id">{alertText}</span>}
          />
        </Snackbar>
      </div>
    );
  }
}

export default withStyles(styles)(StartStopDaemon);
