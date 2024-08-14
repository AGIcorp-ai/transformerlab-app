import { Button, CircularProgress } from '@mui/joy';
import { PlayCircleIcon, StopCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { activateWorker } from 'renderer/lib/transformerlab-api-sdk';

import InferenceEngineModal from './InferenceEngineModal';
import * as chatAPI from 'renderer/lib/transformerlab-api-sdk';
import OneTimePopup from 'renderer/components/Shared/OneTimePopup';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function RunModelButton({
  experimentInfo,
  killWorker,
  models,
  mutate = () => {},
}) {
  const [jobId, setJobId] = useState(null);
  const [showRunSettings, setShowRunSettings] = useState(false);
  const [inferenceSettings, setInferenceSettings] = useState({
    inferenceEngine: null,
    inferenceEngineFriendlyName: '',
  });

  function isPossibleToRunAModel() {
    // console.log('Is Possible?');
    // console.log(experimentInfo);
    // console.log(inferenceSettings);
    return (
      experimentInfo != null &&
      experimentInfo?.config?.foundation !== '' &&
      inferenceSettings?.inferenceEngine != null
    );
  }

  // useEffect(() => {
  //   if (experimentInfo?.config?.inferenceParams) {
  //     setInferenceSettings(JSON.parse(experimentInfo?.config?.inferenceParams));
  //   }
  // }, [experimentInfo]);

  // Set a default inference Engine if there is none
  useEffect(() => {
    // console.log('Searching for primary inference engine');
    // console.log(inferenceSettings);
    (async () => {
      if (inferenceSettings?.inferenceEngine == null) {
        const inferenceEngines = await fetch(
          chatAPI.Endpoints.Experiment.ListScriptsOfType(
            experimentInfo?.id,
            'loader', // type
            'model_architectures:' +
              experimentInfo?.config?.foundation_model_architecture //filter
          )
        );
        const inferenceEnginesJSON = await inferenceEngines.json();
        const experimentId = experimentInfo?.id;
        const engine = inferenceEnginesJSON?.[0]?.uniqueId;

        await fetch(
          chatAPI.Endpoints.Experiment.UpdateConfig(
            experimentId,
            'inferenceParams',
            JSON.stringify({
              ...inferenceSettings,
              inferenceEngine: engine,
            })
          )
        );
        setInferenceSettings({
          inferenceEngine: inferenceEnginesJSON?.[0]?.uniqueId,
        });
      }
    })();
  }, [experimentInfo]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '0px',
      }}
    >
      {models != null && (
        <OneTimePopup title="Congratulations on Running your first Model 🚀">
          You can now go to <b>Interact</b>, <b>Query Docs</b>, and{' '}
          <b>Embeddings</b> tabs to chat with it.
        </OneTimePopup>
      )}
      {/* {JSON.stringify(models)} */}
      {/* {jobId} */}
      {/* {JSON.stringify(experimentInfo)} */}
      {/* {JSON.stringify(inferenceSettings)} */}
      {models === null ? (
        <>
          <Button
            startDecorator={
              jobId === -1 ? (
                <CircularProgress size="sm" thickness={2} />
              ) : (
                <PlayCircleIcon />
              )
            }
            color="success"
            size="lg"
            sx={{ fontSize: '1.1rem', marginRight: 1, minWidth: '200px' }}
            onClick={async (e) => {
              if (inferenceSettings?.inferenceEngine === null) {
                setShowRunSettings(!showRunSettings);
                return;
              }

              setJobId(-1);

              const inferenceEngine = inferenceSettings?.inferenceEngine;

              const response = await activateWorker(
                experimentInfo?.config?.foundation,
                experimentInfo?.config?.foundation_filename,
                experimentInfo?.config?.adaptor,
                inferenceEngine,
                inferenceSettings,
                experimentInfo?.id
              );
              if (response?.status == 'error') {
                alert(`Failed to start model:\n${response?.message}`);
                setJobId(null);
                return;
              }
              const job_id = response?.job_id;
              setJobId(job_id);
              mutate();
            }}
            disabled={!isPossibleToRunAModel()}
          >
            {isPossibleToRunAModel() ? 'Run' : 'No Available Engine'}
          </Button>
        </>
      ) : (
        <Button
          onClick={async () => {
            await killWorker();
            setJobId(null);
          }}
          startDecorator={
            models?.length == 0 ? (
              <CircularProgress size="sm" thickness={2} />
            ) : (
              <StopCircleIcon />
            )
          }
          color="success"
          size="lg"
          sx={{ fontSize: '1.1rem', marginRight: 1, minWidth: '200px' }}
        >
          Stop
        </Button>
      )}
      <Button
        variant="plain"
        onClick={() => setShowRunSettings(!showRunSettings)}
        disabled={models?.length > 0 || jobId == -1}
      >
        using{' '}
        {inferenceSettings?.inferenceEngineFriendlyName ||
          inferenceSettings?.inferenceEngine ||
          'Engine'}
      </Button>
      <InferenceEngineModal
        showModal={showRunSettings}
        setShowModal={setShowRunSettings}
        experimentInfo={experimentInfo}
        inferenceSettings={inferenceSettings}
        setInferenceSettings={setInferenceSettings}
      />
    </div>
  );
}
