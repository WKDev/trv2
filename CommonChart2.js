import { useEffect, useContext, useState, useRef } from "react";
import { Context } from "contexts/index";
import { UPDATE, CHART_TYPE } from "contexts/actionTypes";

import {
  Flex,
  useColorModeValue,
  Text,
  Switch,
  Button,
  HStack,
  Divider,
  Spacer,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  PopoverAnchor,
  Checkbox,
} from "@chakra-ui/react";

import { QuestionIcon } from "@chakra-ui/icons";
import Card from "components/card/Card";
import { distFormatter } from "utils/distFormatter";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Interaction,
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import annotationPlugin from "chartjs-plugin-annotation";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  annotationPlugin,
  CrosshairPlugin
);
Interaction.modes.interpolate = Interpolate;

const CommonChart2 = (props) => {
  const chartRef = useRef(null);

  const { refUp, refDown, data1, data2, data1_title, data2_title, yr, offset1, offset2, yr_min, yr_max, lrdiff_integ, setLrdiff_integ } = props;
  const [zoomState, setZoomState] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [showrefLine, setShowrefLine] = useState(true);
  const annotation = {
    annotations: {
      box1: {
        type: "box",
        yMin: refDown,
        yMax: refUp,
        backgroundColor: "#cbf5d62f",
        borderColor: "#7af59a",
        borderWidth: 2,
        z: 2,
      },

      label1: {
        type: "label",
        // xValue: 1,
        yValue: refDown,
        backgroundColor: "rgba(245,245,245)",
        content: `${refDown}mm`,
        position: "right",
        backgroundColor: "#7af59a",
        borderColor: "#7af59a",
        font: {
          size: 11,
        },
        z: 2,
      },
      label2: {
        type: "label",
        // xValue: 1,
        yValue: refUp,
        backgroundColor: "rgba(245,245,245)",
        content: `${refUp}mm`,
        position: "right",
        backgroundColor: "#7af59a",
        borderColor: "#7af59a",
        borderWidth: 1,
        font: {
          size: 11,
        },
        z: 2,
      },
      line1: {
        type: "line",
        value: refDown,

        yMin: refDown,
        yMax: refDown,
        label: {
          enabled: true,
          content: [`${refDown}`],
          position: "center",
          backgroundColor: "black",
        },
        backgroundColor: "#7af59a2f",
        borderColor: "#7af59a",
        borderWidth: 2,
        position: "end",
        xAdjust: -100,
        z: -10,
        zIndex: -10,
      },
      line2: {
        type: "line",
        label: {
          mode: "horizontal",

          content: `${refUp}`,
          // content:'max',
          enabled: true,
          backgroundColor: "rgba(0,0,0,0)",
          position: "end",
          xAdjust: -100,
        },
        value: refUp,
        yMin: refUp,
        yMax: refUp,
        backgroundColor: "#cbf5d62f",
        borderColor: "#7af59a",
        borderWidth: 2,
        zIndex: -10,
      },
    },
  };
  const cjsOptions = {
    animation: {
      enabled: false,
      duration: 0.5,
    },

    responsive: true,
    scales: {
      x: {
        offset: false, // x축 여백 제거

        type: "linear", // or 'time', or other scales
        title: {
          display: true,
          text: "Distance[m]",
        },
        ticks: {
          callback: function (value) {
            return `${distFormatter(value)}m`;
          },
        },
        z: 10,
      },
      y: {
        offset: false,

        type: "linear",
        title: {
          display: true,
          text: "Measurement[mm]",
        },
        ticks: {
          callback: function (value) {
            return `${Number(value).toFixed(1)} mm`;
          },
        },
        z: 10,
        // min: getAdjustedMin(y,y2,refDown),
        // max: getAdjustedMax(y,y2,refUp),
        min: yr[0],
        max: yr[1],
        // further settings as needed
      },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          // This more specific font property overrides the global property
          font: {
            size: 16,
          },
        },
      },
      tooltip: {
        // mode : 'interpolate',
        // intersect: false,
        backgroundColor: "#f0f0f0ef", // Tooltip 배경색을 gray로 설정
        borderColor: "#dddddd",
        titleColor: "#000000",
        borderWidth: 1.5,
        titleSpacing: 4,
        bodyColor: "#000000", // 툴팁의 본문 색상
        footerColor: "#000000", // 툴팁의 바닥글 색상
        titleFont: {
          size: 16,
        },
        padding: 10,
        bodyFont: {
          size: 16, // 폰트 크기를 14로 설정
          color: "black", // 글자 색상을 까만색으로 설정
        },
        callbacks: {
          title: function (tooltipItem, data) {
            return (
              distFormatter(
                Number(tooltipItem[0].parsed.x).toFixed(2)
              ) + "m"
            );
          },
          label: function (context) {
            const label = context.dataset.label || "";

            if (label) {
              return `${label}: ${context.parsed.y.toFixed(2)}mm`;
            } else {
              return context.parsed.y + "mm";
            }
          },
        },
      },
      annotation: annotation,
      crosshair: {
        line: {
          color: "#000", // crosshair line color
          width: 1, // crosshair line width
        },
        sync: {
          enabled: false, // enable trace line syncing with other charts
          group: 1, // chart group
          suppressTooltips: false, // suppress tooltips when showing a synced tracer
        },
        zoom: { enabled: false },
      },
      zoom: {
        limits: {
          x: { min: "original", max: "original" }, // or specific min/max values
          y: { min: "original", max: "original" }, // or specific min/max values
        },
        pan: {
          enabled: true,
          mode: "xy",
          drag: false, // 드래그를 통한 팬을 가능하게 합니다.
          threshold: 5,
          rangeMin: {
            x: null,
            y: null,
          },
          rangeMax: {
            x: null,
            y: null,
          },
          // onPanComplete: function ({ chart }) {
          //   updateYAxisLimits(chart);
          // },
        },
        zoom: {
          wheel: {
            enabled: true,
            modifierKey: "ctrl",
          },
          pinch: {
            enabled: true,
          },
          mode: "x",
          // onZoomComplete: function ({ chart }) {
          // updateYAxisLimits(chart);

          // console.log(chart)

          // setZoomState({
          //   zoom: chart.getZoomLevel(),
          //   pan: {
          //     x: chart.scales.x.min,
          //     y: chart.scales.y.min
          //   }
          // });
          // },
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "xy",
      intersect: false,
    },
    // Additional settings as needed...
  };

  const [cjsState, setCjsState] = useState(cjsOptions);

  useEffect(() => {
    const chartDOMElement = chartRef.current;

    if (!chartDOMElement) return;

    const canvasElement = chartDOMElement.canvas;

    if (!canvasElement) return;

    const handleWheelEvent = (e) => {
      const { deltaY } = e;

      // delta가 양수일 경우 zoom in, 음수일 경우 zoom out을 실행합니다.
      if (deltaY > 0) {
        chartDOMElement.pan({ x: 20 });
      } else {
        chartDOMElement.pan({ x: -20 });
      }
    };

    canvasElement.addEventListener("wheel", handleWheelEvent);

    return () => {
      canvasElement.removeEventListener("wheel", handleWheelEvent);
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      const chartDOMElement = chartRef.current;
      chartDOMElement.resetZoom(); // 리렌더링 시 zoom 상태를 초기화합니다.
    }
    chartRef.current.update();
  }, [yr]);

  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current;
      chart.options.scales.y.min = yr[0];
      chart.options.scales.y.max = yr[1];
      chart.update();
    }
  }, [yr]);

  const handleResetZoom = () => {
    if (chartRef && chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const inputText = useColorModeValue("primaryGray.900", "gray.100");
  const exportColor = useColorModeValue("brand.500", "white");
  const exportColorDeep = useColorModeValue("brand.800", "white");
  const inputBg = useColorModeValue("secondaryGray.300", "navy.900");
  const textColor = useColorModeValue("secondaryGray.900", "white");

  function updateYAxisLimits(chart) {
    const datasets = chart.data.datasets;
    const xAxis = chart.scales["x"];

    let min1 = Number.POSITIVE_INFINITY;
    let max1 = Number.NEGATIVE_INFINITY;
    let min2 = Number.POSITIVE_INFINITY;
    let max2 = Number.NEGATIVE_INFINITY;

    datasets.forEach((dataset, datasetIndex) => {
      const yAxisId = dataset.yAxisID || "y"; // Default to 'y' if no yAxisID is specified
      dataset.data.forEach((point) => {
        // Assuming data points are objects like {x: value, y: value}
        const xValue = point.x;
        const yValue = point.y;

        // Check if the xValue is within the visible range of the x-axis
        // This requires converting xValue to pixel coordinates or comparing with xAxis.min and xAxis.max
        // For simplicity, let's assume we want to find min/max for all data points if specific logic for visible range is complex
        // or ensure xAxis.getPixelForValue is used correctly if needed.
        // The original logic:
        // const scaleValue = xAxis.getPixelForValue(value, index); // 'value' here was from dataset.data which was an array of y-values, index was its index.
        // if (scaleValue >= xAxis.left && scaleValue <= xAxis.right)
        // This needs to be adapted for {x,y} points.

        // Simplified approach: Consider all points or use chart.helpers.isInRange if available and suitable
        // For now, let's consider all points for min/max calculation of y values
        // and assume the chart itself handles displaying only the visible range.
        // A more accurate way for visible data would be:
        if (xValue >= xAxis.min && xValue <= xAxis.max) {
          if (datasetIndex === 0) { // First dataset
            if (yValue < min1) min1 = yValue;
            if (yValue > max1) max1 = yValue;
          } else if (datasetIndex === 1) { // Second dataset
            // If you have a second y-axis, its ID would be 'y2' typically.
            // And you would check if chart.scales['y2'] exists.
            // For now, assuming both datasets use the primary 'y' axis, or a similar logic for a potential 'y2'
            if (yValue < min2) min2 = yValue; // This would be for the second dataset on the same y-axis or a different one
            if (yValue > max2) max2 = yValue;
          }
        }
      });
    });

    // If both datasets share the same y-axis, you'd find the overall min/max
    const overallMin = Math.min(min1, min2);
    const overallMax = Math.max(max1, max2);


    if (isFinite(overallMin)) {
        chart.scales["y"].min = overallMin;
    }
    if (isFinite(overallMax)) {
        chart.scales["y"].max = overallMax;
    }


    // If there was a separate y2-axis:
    // if (chart.scales["y2"]) {
    //   if (isFinite(min2)) chart.scales["y2"].min = min2;
    //   if (isFinite(max2)) chart.scales["y2"].max = max2;
    // }

    chart.update();
  }

  const cjsDatasets = {
    // labels: x, // x-values are now part of the datasets
    datasets: [
      {
        label: data1_title,
        data: data1, // data1 should be an array of {x, y} objects
        borderColor: "#0000ff",
        backgroundColor: "rgba(0,0,255,0.1)",
        pointBackgroundColor: "#0000ff",
        pointBorderColor: "#0000ff",
        borderWidth: 1,
        radius: 0,
        order: 1,
      },
    ],
  };

  if (data2 && data2.length > 0) {
    cjsDatasets.datasets.push({
      label: data2_title,
      data: data2, // data2 should be an array of {x, y} objects
      borderColor: "#ff0000",
      backgroundColor: "rgba(255,0,0,0.1)",
      pointBackgroundColor: "#ff0000",
      pointBorderColor: "#ff0000",
      borderWidth: 1,
      radius: 0,
      // z: -2, // z-index might not be directly applicable or needed here unless for specific visual layering
      order: 2, // if order matters
    });
  }

  const handleRefLine = (v) => {
    setShowrefLine(v);

    if (v) {
      cjsState.plugins.annotation = annotation;
    } else {
      cjsState.plugins.annotation = {};
    }
    setCjsState(cjsState);
    console.log(cjsState);
  };

  useEffect(() => {
    setCjsState(cjsOptions);
  }, []);

  return (
    <>
      <Card>
        <HStack
          isInline={true}
          width="full"
          justifyContent="space-between"
          mb="20px"
        >
          <HStack isInline={true} justifyContent="flex-end">
            <Spacer />

            <Text
              css={{
                fontFamily: "나눔스퀘어",
                transform: "rotate(0.04deg)",
                fontWeight: "bold",
              }}
            >
              데이터 보정
            </Text>
            <Spacer />
            {offset1}
            <Spacer />
            {offset2}
            <Spacer />

            <Popover>
              <PopoverTrigger>
                <Button
                  leftIcon={<QuestionIcon w={6} h={6} color="gray.500" />}
                  color="gray.800"
                >
                  Shoutcuts
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>Keyboard Shortcuts</PopoverHeader>
                <PopoverBody>
                  <Text>⬆️ / ⬇️ : ± 1mm</Text>
                  <Text>Ctrl + ⬆️ / ⬇️ : ± 10mm</Text>
                  <Text>Shift + ⬆️ / ⬇️: ±100mm</Text>
                  <Text>Home / Esc : reset</Text>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </HStack>
          <HStack isInline={true} justifyContent="flex-end">
            <Button disabled fontSize="14px">
              Ctrl + Wheel to Zoom
            </Button>
            <Button disabled fontSize="14px">
              Drag / Scroll to Pan
            </Button>
            <Button
              bg={exportColor}
              css={{ fontFamily: "나눔스퀘어", transform: "rotate(0.04deg)" }}
              onClick={() => {
                handleResetZoom();
              }}
              color={inputBg}
              fontSize="14px"
            >
              Reset Zoom
            </Button>
            <Spacer />
          </HStack>
        </HStack>

        <Divider mb="20px" />

        <Line
          ref={chartRef}
          options={cjsState}
          data={cjsDatasets}
          height={80}
        />
        <Flex direction={"row"} align="center" justify={"space-between"}>
          <HStack>
            <Text fontSize="14px" color="gray.500">
              y scale
            </Text>
            {yr_min}

            {yr_max}
          </HStack>
          <HStack justifyContent="flex-end">
            {lrdiff_integ !== undefined ? (
              <Checkbox
                me="20px"
                isChecked={lrdiff_integ}
                onChange={(e) => {
                  setLrdiff_integ(e.target.checked);
                }}
              >
                좌우차 표현
              </Checkbox>
            ) : null}

            <Checkbox
              me="20px"
              isChecked={showrefLine}
              onChange={(e) => {
                handleRefLine(e.target.checked);
              }}
            >
              기준선 표시
            </Checkbox>
          </HStack>
        </Flex>
      </Card>
    </>
  );
};

export default CommonChart2;
