import {
  VSCodeDivider,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import cn from "classnames";
import React, { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";
import { Spacer } from "./ui/Spacer";
import { Label } from "./ui/Text";
import { broker } from "../globals/html-broker";
import styles from "../sidebar.entry.scss";
import { PanelSection } from "./ui/PanelSection";
import { HostingState } from "../webview-types";
import { ChannelWithId } from "../messaging/types";
import { ExternalLink } from "./ui/ExternalLink";
import { SplitButton } from "./ui/SplitButton";
import { MenuItem } from "./ui/popup-menu/PopupMenu";

interface DeployInfo {
  date: string;
  channelId: string;
  succeeded: boolean;
}

export function DeployPanel({
  hostingState,
  setHostingState,
  projectId,
  channels,
}: {
  hostingState: HostingState;
  setHostingState: (hostingState: HostingState) => void;
  projectId: string;
  channels: ChannelWithId[];
}) {
  const [deployTarget, setDeployTarget] = useState<string>("live");
  const [newPreviewChannel, setNewPreviewChannel] = useState<string>("");
  const [deployedInfo, setDeployedInfo] = useState<DeployInfo>(null);

  useEffect(() => {
    if (hostingState === "success" || hostingState === "failure") {
      setDeployedInfo({
        date: new Date().toLocaleDateString(),
        channelId: deployTarget === "new" ? newPreviewChannel : deployTarget,
        succeeded: hostingState === "success",
      });
      setNewPreviewChannel("");
    }
  }, [hostingState]);

  useEffect(() => {
    broker.on("notifyPreviewChannelResponse", ({ id }: { id: string }) => {
      if (!id) {
        return;
      }
      setNewPreviewChannel(id);
      setDeployTarget(id);
    });
  }, [broker]);

  function getNewPreviewChannelName() {
    broker.send("promptUserForInput", {
      title: "New Preview Channel",
      prompt: "Enter a name for the new preview channel",
    });
  }

  if (!channels) {
    return (
      <>
        <VSCodeDivider style={{ width: "100vw" }} />
        <Spacer size="medium" />
        <PanelSection title="Hosting">
          <Label>Loading hosting channels</Label>
          <Label>
            <VSCodeProgressRing />
          </Label>
        </PanelSection>
      </>
    );
  }

  channels.sort((a, b) => (a.id === "live" ? -1 : 0));

  let siteLink = null;

  const existingChannel = channels.find(
    (channel) => channel.id === deployTarget
  );

  if (existingChannel) {
    siteLink = (
      <ExternalLink
        href={existingChannel.url}
        text={
          existingChannel.id === "live"
            ? `${projectId}.web.app`
            : `go to ${existingChannel.id} site`
        }
      />
    );
  }

  const channelDropdownOptions = channels.map((channel) => (
    <MenuItem
      key={channel.id + (channel.id === deployTarget ? "-checked" : "")}
      onClick={(e) => setDeployTarget(channel.id)}
    >
      Deploy to {channel.id === "live" ? "Live Channel" : `"${channel.id}"`}
    </MenuItem>
  ));

  const DeploySplitButton = (
    <SplitButton
      appearance="primary"
      onClick={() => {
        setHostingState("deploying");
        broker.send("hostingDeploy", {
          target: deployTarget === "new" ? newPreviewChannel : deployTarget,
        });
      }}
      popupMenuContent={
        <>
          {channelDropdownOptions}
          {newPreviewChannel && (
            <MenuItem
              key={newPreviewChannel}
              onClick={() => setDeployTarget(newPreviewChannel)}
            >
              {`Deploy to ${newPreviewChannel}`}
            </MenuItem>
          )}
          <MenuItem key="new" onClick={getNewPreviewChannelName}>
            Create a new preview channel
          </MenuItem>
        </>
      }
    >
      Deploy to {deployTarget === "live" ? "Live Channel" : `"${deployTarget}"`}
    </SplitButton>
  );

  //TODO(chholland): Fill this in based on what was fetched from listChannels()
  let deployedText = "not deployed yet";
  if (deployedInfo?.succeeded) {
    deployedText = `Deployed ${deployedInfo.date} to ${deployedInfo.channelId}`;
  } else if (deployedInfo && !deployedInfo?.succeeded) {
    deployedText = `Failed deploy at ${deployedInfo.date} to ${deployedInfo.channelId}`;
  }

  return (
    <>
      <VSCodeDivider style={{ width: "100vw" }} />
      <Spacer size="medium" />
      <PanelSection title="Hosting">
        <>
          {DeploySplitButton}
          <Spacer size="xsmall" />
          {hostingState !== "deploying" && (
            <>
              <Spacer size="xsmall" />
              <div>
                <Label level={3} className={styles.hostingRowLabel}>
                  <Spacer size="xsmall" />
                  <Icon
                    className={styles.hostingRowIcon}
                    slot="start"
                    icon="history"
                  ></Icon>
                  {deployedText}
                </Label>
              </div>
            </>
          )}
          {hostingState === "deploying" && (
            <>
              <Spacer size="medium" />
              <div className={styles.integrationStatus}>
                <VSCodeProgressRing
                  className={cn(
                    styles.integrationStatusIcon,
                    styles.integrationStatusLoading
                  )}
                />
                <Label level={3}> Deploying...</Label>
              </div>
            </>
          )}
          <Spacer size="medium" />
          {siteLink && (
            <Label level={3} className={styles.hostingRowLabel}>
              <Spacer size="xsmall" />
              <Icon
                className={styles.hostingRowIcon}
                slot="start"
                icon="globe"
              ></Icon>
              {siteLink}
            </Label>
          )}
        </>
      </PanelSection>
    </>
  );
}
