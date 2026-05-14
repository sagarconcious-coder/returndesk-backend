import {
  createRma as createRmaDb,
  getRmaById as getRmaByIdDb,
  getRmaByNumber,
  getRmasByDealerId as getRmasByDealerIdDb,
  getAllRmas as getAllRmasDb,
  updateRmaStatus,
} from "./rma.model.js";
import { getDealerById } from "../dealers/dealers.model.js";
import logger from "../../config/logger.js";

////////////////////////////////////////////////// A) createRma(dealer_id, product_serial, product_name, issue_description)
export const createRma = async (
  dealer_id,
  product_serial,
  product_name,
  issue_description,
) => {
  // 1. Verify dealer exists and is ACTIVE
  const dealer = await getDealerById(dealer_id);

  if (!dealer) {
    throw new Error("Dealer not found");
  }
  if (dealer.status !== "ACTIVE") {
    throw new Error(`Cannot create RMA. Dealer status is ${dealer.status}`);
  }

  // 2. Generate rma_number: `RMA-${Date.now()}`
  const rma_number = `RMA-${Date.now()}`;
  const newRma = await createRmaDb(
    dealer_id,
    rma_number,
    product_serial,
    product_name,
    issue_description,
  );
  logger.info(`RMA create: ${rma_number}`);
  return newRma;
};

/////////////////////////////////////////////// B) getRmaById(id)
export const getRmaById = async (id) => {
  // 1. Call getRmaById model function
  const rma = await getRmaByIdDb(id);

  // 2. If not found, throw error
  if (!rma) {
    throw new Error(`RMA not found`);
  }

  // 3. Return RMA
  return rma;
};

//////////////////////////////////////////////// C) getRmasByDealerId(dealer_id, status)
export const getRmasByDealerId = async (dealer_id, status = null) => {
  // → call model function, return RMAs
  const rmas = await getRmasByDealerIdDb(dealer_id, status);
  return rmas;
};

////////////////////////////////////////////////// D) getAllRmas(status)
export const getAllRmas = async (status = null) => {
  const rmas = await getAllRmasDb(status);
  return rmas;
};
// → call model function, return RMAs

/////////////////////////////////////////////////// E) approveRma(id)
export const approveRma = async (id) => {
  // → call updateRmaStatus(id, 'APPROVED', null), return updated RMA

  const rma = await updateRmaStatus(id, "APPROVED", null);
  return rma;
};

///////////////////////////////////////////////////// F) rejectRma(id, reason)
export const rejectRma = async (id, reason) => {
  // → call updateRmaStatus(id, 'REJECTED', reason), return updated RMA
  const rma = await updateRmaStatus(id, "REJECTED", reason);
  return rma;
};
