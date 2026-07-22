import { registerPickupLocation } from "../../common/services/shiprocket.service.js";
import { updateDealerShiprocketPickupLocation } from "../dealers/dealer.repository.js";

/////////////////////////////////////////////// 1) Resolves the pickup address to use for an RMA:
// the (dealer's registered profile address)(or the custom address entered for this RMA)
export const resolvePickupAddress = (dealer, rma) =>
  rma.pickup_same_as_profile
    ? {
        address_line1: dealer.address_line1,
        city: dealer.city,
        state: dealer.state,
        pincode: dealer.pincode,
        name: dealer.full_name,
        phone: dealer.mobile,
        email: dealer.email,
      }
    : {
        address_line1: rma.pickup_address_line1,
        city: rma.pickup_city,
        state: rma.pickup_state,
        pincode: rma.pickup_pincode,
        name: dealer.full_name,
        phone: dealer.mobile,
        email: dealer.email,
      };

// Resolves the Shiprocket pickup_location nickname for an address, reusing
// the dealer's cached location when the RMA uses the dealer's profile
// address (and caching a freshly registered one back onto the dealer), or
// registering a fresh one-off location for a custom RMA address.
export const resolveShiprocketPickupLocation = async (dealer, rma, address) => {
  if (rma.pickup_same_as_profile && dealer.shiprocket_pickup_location) {
    return dealer.shiprocket_pickup_location;
  }

  const registered = await registerPickupLocation(address);
  const pickupLocation = registered.pickup_location;

  if (rma.pickup_same_as_profile) {
    await updateDealerShiprocketPickupLocation(dealer.id, pickupLocation);
  }

  return pickupLocation;
};
