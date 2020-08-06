import { isExist, omit } from '@src/helpers/utils';
import { ScaleData, ValueEdge } from '@t/store/store';
import { add, multiply, divide } from '@src/helpers/calculator';
import { Scale } from '@t/options';
import { calculateCoordinateScale, makeScaleOption } from '@src/scale/coordinateScaleCalculator';

interface LabelOptions {
  dataRange: ValueEdge;
  offsetSize: number;
  rawCategoriesSize: number;
  scaleOption?: Scale;
  showLabel?: boolean;
}

const msMap = {
  year: 31536000000,
  month: 2678400000,
  week: 604800000,
  date: 86400000,
  hour: 3600000,
  minute: 60000,
  second: 1000,
};

export function calculateDatetimeScale(options: LabelOptions) {
  const { dataRange, rawCategoriesSize, scaleOption } = options;
  const datetimeInfo = makeDatetimeInfo(dataRange, rawCategoriesSize, scaleOption);
  const { minDate, divisionNumber, limit } = datetimeInfo;

  const scale = calculateCoordinateScale({
    ...omit(options, 'scaleOption'),
    dataRange: limit,
    minStepSize: 1,
  });

  return restoreScaleToDatetimeType(scale, minDate, divisionNumber);
}

const msTypes = ['year', 'month', 'week', 'date', 'hour', 'minute', 'second'];

function restoreScaleToDatetimeType(scale: ScaleData, minDate: number, divisionNumber: number) {
  const { limit, stepSize } = scale;
  const { min, max } = limit;

  return {
    ...scale,
    stepSize: multiply(stepSize, divisionNumber),
    limit: {
      min: multiply(add(min, minDate), divisionNumber),
      max: multiply(add(max, minDate), divisionNumber),
    },
  };
}

function makeDatetimeInfo(limit: ValueEdge, count: number, scaleOption?: Scale) {
  const dateType = findDateType(limit, count);
  const divisionNumber = scaleOption?.stepSize ?? msMap[dateType];
  const scale = makeScaleOption(limit, scaleOption);

  const minDate = divide(Number(new Date(scale.min)), divisionNumber);
  const maxDate = divide(Number(new Date(scale.max)), divisionNumber);
  const max = maxDate - minDate;

  return { divisionNumber, minDate, limit: { min: 0, max } };
}

function findDateType({ max, min }: ValueEdge, count: number) {
  const diff = max - min;
  const lastTypeIndex = msTypes.length - 1;
  let foundType;

  if (diff) {
    msTypes.every((type, index) => {
      const millisecond = msMap[type];
      const dividedCount = Math.floor(diff / millisecond);
      let foundIndex;

      if (dividedCount) {
        foundIndex =
          index < lastTypeIndex && dividedCount < 2 && dividedCount < count ? index + 1 : index;
        foundType = msTypes[foundIndex];
      }

      return !isExist(foundIndex);
    });
  } else {
    foundType = 'second';
  }

  return foundType;
}
